# Crawl4AI Structured Extraction Service

A minimal FastAPI server that exposes `/health` and `/extract` for chunked LLM-based structured extraction.

## Endpoints

- GET `/health` → `{ ok: true }`
- POST `/extract`
  - Request body:
    ```json
    {
      "urls": ["https://..."],
      "query": "user task",
      "target_rows": 25,
      "strategy": "llm",
      "schema": null,
      "chunking": { "window_size": 600, "overlap": 60 },
      "llm": { "provider": "openai", "model": "gpt-4o-mini", "temperature": 0.1, "json_mode": true },
      "filters": null
    }
    ```
  - Response body:
    ```json
    {
      "success": true,
      "results": [
        { "url": "https://...", "title": "...", "rows": [ {"...": "..."} ] }
      ]
    }
    ```

## Setup

1. Create a virtual environment and install dependencies:
   ```bash
   python -m venv .venv
   .venv\\Scripts\\activate
   pip install -r requirements.txt
   ```

2. Set environment variables (PowerShell):
   ```powershell
   $env:OPENAI_API_KEY = "<YOUR_OPENAI_KEY>"
   $env:CRAWL4AI_LLM_MODEL = "gpt-4o-mini"
   ```

3. Run the server (port 11235):
   ```powershell
   uvicorn main:app --host 0.0.0.0 --port 11235
   ```

4. Test:
   ```powershell
   curl http://localhost:11235/health
   ```

This server currently supports `provider = openai` only. It chunks page text and performs per-chunk extraction, dedupes rows, and stops once per-URL target rows are reached.
