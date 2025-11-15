import os
import re
import json
import math
from typing import List, Optional, Dict, Any

import httpx
from fastapi import FastAPI
from pydantic import BaseModel, Field
from bs4 import BeautifulSoup

# Optional: load .env if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
DEFAULT_MODEL = os.getenv("CRAWL4AI_LLM_MODEL", "gpt-4o-mini")

app = FastAPI(title="Crawl4AI Structured Extraction Service", version="0.1.0")


class ChunkingOptions(BaseModel):
    window_size: int = Field(600, ge=200, le=4000)
    overlap: int = Field(60, ge=0, le=1000)


class LLMOptions(BaseModel):
    provider: str = Field("openai")
    model: str = Field(DEFAULT_MODEL)
    temperature: float = Field(0.1, ge=0.0, le=1.0)
    json_mode: bool = True


class ExtractRequest(BaseModel):
    urls: List[str]
    query: str
    target_rows: int = Field(25, ge=1, le=2000)
    strategy: Optional[str] = Field("llm")
    schema: Optional[List[Dict[str, Any]]] = None
    chunking: ChunkingOptions = Field(default_factory=ChunkingOptions)
    llm: LLMOptions = Field(default_factory=LLMOptions)
    filters: Optional[Dict[str, Any]] = None


class PageResult(BaseModel):
    url: str
    title: Optional[str] = None
    rows: List[Dict[str, Any]] = Field(default_factory=list)
    schema: Optional[List[Dict[str, Any]]] = None


class ExtractResponse(BaseModel):
    success: bool
    results: List[PageResult] = Field(default_factory=list)
    error: Optional[str] = None


@app.get("/health")
async def health():
    return {"ok": True}


def clean_html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    # Remove script/style
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    text = soup.get_text(separator="\n")
    # Normalize whitespace
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    return text.strip()


def chunk_text(text: str, window: int, overlap: int) -> List[str]:
    if window <= 0:
        return [text]
    chunks = []
    start = 0
    n = len(text)
    step = max(1, window - overlap)
    while start < n:
        end = min(n, start + window)
        chunks.append(text[start:end])
        if end >= n:
            break
        start += step
    return chunks


async def fetch_url(url: str) -> Dict[str, Optional[str]]:
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            resp = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (compatible; Crawl4AI/0.1; +https://example.com)"
            })
            resp.raise_for_status()
            html = resp.text
            title_match = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
            title = None
            if title_match:
                title = BeautifulSoup(title_match.group(1), "lxml").get_text().strip()
            return {"html": html, "title": title}
    except Exception as e:
        return {"html": None, "title": None, "error": str(e)}


def extract_json_candidates(text: str) -> List[str]:
    # Extract ```json ... ``` blocks or plain {...} objects or [...] arrays
    blocks = []
    code_blocks = re.findall(r"```json\s*(.*?)```", text, flags=re.DOTALL | re.IGNORECASE)
    blocks.extend(code_blocks)
    arrays = re.findall(r"\[(?:.|\n)*?\]", text, flags=re.DOTALL)
    objects = re.findall(r"\{(?:.|\n)*?\}", text, flags=re.DOTALL)
    blocks.extend(arrays)
    blocks.extend(objects)
    return blocks


def safe_parse_rows(text: str) -> List[Dict[str, Any]]:
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            # must be list of dicts
            return [x for x in parsed if isinstance(x, dict)]
        if isinstance(parsed, dict):
            # Accept { rows: [...] }
            if "rows" in parsed and isinstance(parsed["rows"], list):
                return [x for x in parsed["rows"] if isinstance(x, dict)]
    except Exception:
        pass
    return []


async def call_openai_extract(chunk: str, query: str, model: str, temperature: float, json_mode: bool) -> List[Dict[str, Any]]:
    if not OPENAI_API_KEY:
        return []
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)

        system_prompt = (
            "You are a precise data extractor. Return ONLY JSON. "
            "Given a chunk of webpage text and a user query, extract structured rows relevant to the query. "
            "If nothing relevant exists, return an empty array []."
        )
        user_prompt = (
            f"USER QUERY:\n{query}\n\n"
            f"CHUNK:\n{chunk[:8000]}\n\n"
            "Return JSON array of objects. No prose. No markdown."
        )

        # Prefer json_object response format; if model does not support, we'll parse candidates
        try:
            resp = client.chat.completions.create(
                model=model,
                temperature=temperature,
                response_format={"type": "json_object"} if json_mode else None,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            text = resp.choices[0].message.content or ""
        except Exception:
            # Fallback without response_format
            resp = client.chat.completions.create(
                model=model,
                temperature=temperature,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            text = resp.choices[0].message.content or ""

        # Parse rows
        # 1) direct JSON array
        rows = safe_parse_rows(text)
        if rows:
            return rows
        # 2) code-blocks / candidates
        for cand in extract_json_candidates(text):
            rows = safe_parse_rows(cand)
            if rows:
                return rows
        return []
    except Exception:
        return []


def dedupe_rows(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    out = []
    for r in rows:
        key = json.dumps(r, sort_keys=True)
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


@app.post("/extract", response_model=ExtractResponse)
async def extract(req: ExtractRequest) -> ExtractResponse:
    if not req.urls:
        return ExtractResponse(success=False, results=[], error="No URLs provided")
    if req.llm.provider.lower() != "openai":
        # Only OpenAI implemented here
        return ExtractResponse(success=False, results=[], error="Only OpenAI provider implemented in this server")
    if not OPENAI_API_KEY:
        return ExtractResponse(success=False, results=[], error="OPENAI_API_KEY not set on server")

    per_url_target = max(1, math.ceil(req.target_rows / max(1, len(req.urls))))
    results: List[PageResult] = []

    for url in req.urls:
        fetched = await fetch_url(url)
        html = fetched.get("html")
        title = fetched.get("title")
        if not html:
            results.append(PageResult(url=url, title=title, rows=[]))
            continue
        text = clean_html_to_text(html)
        chunks = chunk_text(text, req.chunking.window_size * 10, req.chunking.overlap * 10)  # rough char-based window

        accumulated: List[Dict[str, Any]] = []
        for ch in chunks:
            rows = await call_openai_extract(
                chunk=ch,
                query=req.query,
                model=req.llm.model or DEFAULT_MODEL,
                temperature=req.llm.temperature,
                json_mode=req.llm.json_mode,
            )
            if rows:
                accumulated.extend(rows)
                accumulated = dedupe_rows(accumulated)
            if len(accumulated) >= per_url_target:
                break

        results.append(PageResult(url=url, title=title, rows=accumulated))

    return ExtractResponse(success=True, results=results)
