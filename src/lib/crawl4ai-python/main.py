import json
import re
import time
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import urllib.parse

app = FastAPI(title="Real Web Scraping Service", version="1.0.0")

class ExtractDataRequest(BaseModel):
    urls: List[str]
    prompt: str
    num_rows: int

class ExtractDataResponse(BaseModel):
    success: bool
    data: List[Dict[str, Any]]
    csv: str
    tables_found: int
    feedback: str

class WebScraper:
    def __init__(self):
        self.driver = None
        self.setup_driver()
    
    def setup_driver(self):
        """Setup Chrome driver with proper options"""
        try:
            chrome_options = Options()
            chrome_options.add_argument("--headless")  # Run in background
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
            
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            print("Chrome driver initialized successfully")
        except Exception as e:
            print(f"Failed to initialize Chrome driver: {e}")
            self.driver = None
    
    def scrape_url(self, url: str, prompt: str) -> Dict[str, Any]:
        """Scrape a single URL and extract relevant data"""
        result = {
            "url": url,
            "tables": [],
            "text_data": [],
            "links": [],
            "success": False,
            "error": None
        }
        
        try:
            print(f"Scraping: {url}")
            
            if self.driver:
                # Use Selenium for JavaScript-heavy sites
                result = self._scrape_with_selenium(url, prompt)
            else:
                # Fallback to requests + BeautifulSoup
                result = self._scrape_with_requests(url, prompt)
                
        except Exception as e:
            print(f"Error scraping {url}: {e}")
            result["error"] = str(e)
        
        return result
    
    def _scrape_with_selenium(self, url: str, prompt: str) -> Dict[str, Any]:
        """Scrape using Selenium for JavaScript-heavy sites"""
        result = {
            "url": url,
            "tables": [],
            "text_data": [],
            "links": [],
            "success": False,
            "error": None
        }
        
        try:
            self.driver.get(url)
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            # Extract tables
            tables = self.driver.find_elements(By.TAG_NAME, "table")
            for table in tables:
                table_data = self._extract_table_data_selenium(table)
                if table_data:
                    result["tables"].append(table_data)
            
            # Extract text content
            text_elements = self.driver.find_elements(By.TAG_NAME, "p")
            for element in text_elements[:20]:  # Limit to first 20 paragraphs
                text = element.text.strip()
                if text and len(text) > 10:
                    result["text_data"].append(text)
            
            # Extract links
            links = self.driver.find_elements(By.TAG_NAME, "a")
            for link in links[:10]:  # Limit to first 10 links
                href = link.get_attribute("href")
                text = link.text.strip()
                if href and text:
                    result["links"].append({"url": href, "text": text})
            
            result["success"] = True
            
        except Exception as e:
            result["error"] = str(e)
        
        return result
    
    def _scrape_with_requests(self, url: str, prompt: str) -> Dict[str, Any]:
        """Scrape using requests + BeautifulSoup for simple sites"""
        result = {
            "url": url,
            "tables": [],
            "text_data": [],
            "links": [],
            "success": False,
            "error": None
        }
        
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract tables
            tables = soup.find_all('table')
            for table in tables:
                table_data = self._extract_table_data_bs4(table)
                if table_data:
                    result["tables"].append(table_data)
            
            # Extract text content
            paragraphs = soup.find_all('p')
            for p in paragraphs[:20]:  # Limit to first 20 paragraphs
                text = p.get_text().strip()
                if text and len(text) > 10:
                    result["text_data"].append(text)
            
            # Extract links
            links = soup.find_all('a', href=True)
            for link in links[:10]:  # Limit to first 10 links
                href = link.get('href')
                text = link.get_text().strip()
                if href and text:
                    # Convert relative URLs to absolute
                    if href.startswith('/'):
                        href = urllib.parse.urljoin(url, href)
                    result["links"].append({"url": href, "text": text})
            
            result["success"] = True
            
        except Exception as e:
            result["error"] = str(e)
        
        return result
    
    def _extract_table_data_selenium(self, table) -> Optional[Dict[str, Any]]:
        """Extract data from a table using Selenium"""
        try:
            rows = table.find_elements(By.TAG_NAME, "tr")
            if len(rows) < 2:
                return None
            
            # Extract headers
            headers = []
            header_row = rows[0]
            header_cells = header_row.find_elements(By.TAG_NAME, "th")
            if not header_cells:
                header_cells = header_row.find_elements(By.TAG_NAME, "td")
            
            for cell in header_cells:
                headers.append(cell.text.strip())
            
            # Extract data rows
            data_rows = []
            for row in rows[1:]:
                cells = row.find_elements(By.TAG_NAME, "td")
                if len(cells) == len(headers):
                    row_data = {}
                    for i, cell in enumerate(cells):
                        if i < len(headers):
                            row_data[headers[i]] = cell.text.strip()
                    data_rows.append(row_data)
            
            if data_rows:
                return {
                    "headers": headers,
                    "rows": data_rows,
                    "row_count": len(data_rows)
                }
            
        except Exception as e:
            print(f"Error extracting table data: {e}")
        
        return None
    
    def _extract_table_data_bs4(self, table) -> Optional[Dict[str, Any]]:
        """Extract data from a table using BeautifulSoup"""
        try:
            rows = table.find_all("tr")
            if len(rows) < 2:
                return None
            
            # Extract headers
            headers = []
            header_row = rows[0]
            header_cells = header_row.find_all(["th", "td"])
            
            for cell in header_cells:
                headers.append(cell.get_text().strip())
            
            # Extract data rows
            data_rows = []
            for row in rows[1:]:
                cells = row.find_all("td")
                if len(cells) == len(headers):
                    row_data = {}
                    for i, cell in enumerate(cells):
                        if i < len(headers):
                            row_data[headers[i]] = cell.get_text().strip()
                    data_rows.append(row_data)
            
            if data_rows:
                return {
                    "headers": headers,
                    "rows": data_rows,
                    "row_count": len(data_rows)
                }
            
        except Exception as e:
            print(f"Error extracting table data: {e}")
        
        return None
    
    def close(self):
        """Close the driver"""
        if self.driver:
            self.driver.quit()

# Global scraper instance
scraper = WebScraper()

@app.post("/extract-data", response_model=ExtractDataResponse)
async def extract_data(request: ExtractDataRequest):
    try:
        all_data = []
        tables_found = 0
        feedback_parts = []
        
        print(f"Starting real web scraping for {len(request.urls)} URLs")
        print(f"Prompt: {request.prompt}")
        print(f"Requested rows: {request.num_rows}")
        
        for url in request.urls:
            try:
                print(f"Processing: {url}")
                result = scraper.scrape_url(url, request.prompt)
                
                if result["success"]:
                    # Add table data
                    for table in result["tables"]:
                        tables_found += 1
                        all_data.extend(table["rows"])
                        feedback_parts.append(f"Extracted {table['row_count']} rows from table on {url}")
                    
                    # Add text data as structured entries
                    for i, text in enumerate(result["text_data"][:5]):  # Limit to 5 text entries per URL
                        all_data.append({
                            "source_url": url,
                            "content_type": "text",
                            "content": text,
                            "extracted_at": time.strftime("%Y-%m-%d %H:%M:%S")
                        })
                    
                    # Add link data
                    for link in result["links"][:3]:  # Limit to 3 links per URL
                        all_data.append({
                            "source_url": url,
                            "content_type": "link",
                            "link_url": link["url"],
                            "link_text": link["text"],
                            "extracted_at": time.strftime("%Y-%m-%d %H:%M:%S")
                        })
                    
                    feedback_parts.append(f"Successfully scraped {url}")
                else:
                    feedback_parts.append(f"Failed to scrape {url}: {result.get('error', 'Unknown error')}")
                
            except Exception as e:
                feedback_parts.append(f"Error processing {url}: {str(e)}")
        
        # If we don't have enough data, generate some based on the prompt
        if len(all_data) < request.num_rows:
            additional_data = generate_smart_synthetic_data(request.prompt, request.num_rows - len(all_data))
            all_data.extend(additional_data)
            feedback_parts.append(f"Generated {len(additional_data)} additional rows based on prompt")
        
        # Limit to requested number of rows
        all_data = all_data[:request.num_rows]
        
        # Convert to CSV
        csv_content = convert_to_csv(all_data)
        
        feedback = "\n".join(feedback_parts) if feedback_parts else "Data extraction completed"
        
        print(f"Extraction complete: {len(all_data)} rows, {tables_found} tables")
        
        return ExtractDataResponse(
            success=True,
            data=all_data,
            csv=csv_content,
            tables_found=tables_found,
            feedback=feedback
        )
        
    except Exception as e:
        print(f"Error in extract_data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    driver_status = "available" if scraper.driver else "unavailable"
    return {
        "status": "ok", 
        "scraping_mode": "real_web_scraping",
        "selenium_driver": driver_status,
        "capabilities": ["tables", "text", "links", "javascript_sites"]
    }

def convert_to_csv(data: List[Dict[str, Any]]) -> str:
    if not data:
        return ""
    df = pd.DataFrame(data)
    return df.to_csv(index=False)

def generate_smart_synthetic_data(prompt: str, num_rows: int) -> List[Dict[str, Any]]:
    """Generate smart synthetic data based on the prompt and scraped data context"""
    synthetic_data = []
    
    # Extract keywords from prompt
    keywords = extract_keywords_from_prompt(prompt)
    
    for i in range(num_rows):
        row = {
            "source": "synthetic",
            "id": f"synth_{i + 1}",
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        # Add fields based on keywords
        if "name" in keywords or "user" in keywords:
            row["name"] = f"User {i + 1}"
        if "email" in keywords:
            row["email"] = f"user{i + 1}@example.com"
        if "age" in keywords:
            row["age"] = 20 + (i % 50)
        if "price" in keywords or "cost" in keywords:
            row["price"] = round(10 + (i * 1.5), 2)
        if "date" in keywords or "time" in keywords:
            row["date"] = f"2024-{(i % 12) + 1:02d}-{(i % 28) + 1:02d}"
        if "category" in keywords or "type" in keywords:
            categories = ["A", "B", "C", "D", "E"]
            row["category"] = categories[i % len(categories)]
        if "score" in keywords or "rating" in keywords:
            row["score"] = round(1 + (i % 5), 1)
        if "status" in keywords:
            statuses = ["active", "inactive", "pending"]
            row["status"] = statuses[i % len(statuses)]
        
        # Add a description based on the prompt
        row["description"] = f"Generated data for '{prompt}' - Row {i + 1}"
        
        synthetic_data.append(row)
    
    return synthetic_data

def extract_keywords_from_prompt(prompt: str) -> List[str]:
    """Extract relevant keywords from the prompt"""
    prompt_lower = prompt.lower()
    keywords = []
    
    field_keywords = [
        "name", "user", "person", "customer", "client",
        "email", "address", "location", "city", "country",
        "age", "year", "birth", "old",
        "price", "cost", "amount", "money", "dollar", "euro",
        "date", "time", "created", "updated", "timestamp",
        "category", "type", "class", "group", "section",
        "score", "rating", "points", "grade", "level",
        "status", "state", "condition", "active", "inactive"
    ]
    
    for keyword in field_keywords:
        if keyword in prompt_lower:
            keywords.append(keyword)
    
    return keywords

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown"""
    scraper.close()

if __name__ == "__main__":
    import uvicorn
    print("Starting Real Web Scraping Service")
    print("Selenium + BeautifulSoup + FastAPI")
    print("Real web scraping capabilities enabled")
    uvicorn.run(app, host="0.0.0.0", port=8000)