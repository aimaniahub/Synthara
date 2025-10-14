import json
import re
import time
import os
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
import requests
from bs4 import BeautifulSoup
import urllib.parse

# Vercel-compatible FastAPI app
app = FastAPI(title="Crawl4AI Service", version="1.0.0")

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
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def scrape_url(self, url: str) -> Dict[str, Any]:
        """Scrape a single URL and extract data"""
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract text content
            text_content = soup.get_text(separator=' ', strip=True)
            
            # Extract tables
            tables = []
            table_elements = soup.find_all('table')
            for i, table in enumerate(table_elements):
                table_data = self.extract_table_data(table)
                if table_data:
                    tables.append({
                        'table_id': i + 1,
                        'data': table_data,
                        'rows': len(table_data),
                        'columns': len(table_data[0]) if table_data else 0
                    })
            
            # Extract links
            links = []
            for link in soup.find_all('a', href=True):
                href = link.get('href')
                if href and href.startswith('http'):
                    links.append({
                        'url': href,
                        'text': link.get_text(strip=True)
                    })
            
            return {
                'url': url,
                'title': soup.title.string if soup.title else 'No title',
                'text_content': text_content[:5000],  # Limit text content
                'tables': tables,
                'links': links[:20],  # Limit links
                'status': 'success'
            }
            
        except Exception as e:
            return {
                'url': url,
                'title': 'Error',
                'text_content': f'Error scraping URL: {str(e)}',
                'tables': [],
                'links': [],
                'status': 'error',
                'error': str(e)
            }
    
    def extract_table_data(self, table) -> List[Dict[str, Any]]:
        """Extract data from HTML table"""
        try:
            rows = table.find_all('tr')
            if not rows:
                return []
            
            # Get headers
            headers = []
            header_row = rows[0]
            for th in header_row.find_all(['th', 'td']):
                headers.append(th.get_text(strip=True) or f'Column_{len(headers)}')
            
            # Get data rows
            data = []
            for row in rows[1:]:
                cells = row.find_all(['td', 'th'])
                if len(cells) == len(headers):
                    row_data = {}
                    for i, cell in enumerate(cells):
                        row_data[headers[i]] = cell.get_text(strip=True)
                    data.append(row_data)
            
            return data
        except Exception as e:
            return []
    
    def generate_synthetic_data(self, prompt: str, num_rows: int) -> List[Dict[str, Any]]:
        """Generate synthetic data based on prompt"""
        # This is a simplified version - in production, you'd use AI
        base_data = []
        
        # Extract keywords from prompt
        keywords = re.findall(r'\b\w+\b', prompt.lower())
        
        for i in range(num_rows):
            row = {
                'id': i + 1,
                'name': f'Item {i + 1}',
                'description': f'Generated data for {prompt[:50]}...',
                'value': round(100 + (i * 10.5), 2),
                'category': keywords[i % len(keywords)] if keywords else 'general',
                'created_at': f'2024-01-{(i % 28) + 1:02d}',
                'active': i % 3 != 0
            }
            base_data.append(row)
        
        return base_data

# Global scraper instance
scraper = WebScraper()

@app.get("/")
async def root():
    return {"message": "Crawl4AI Service is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "crawl4ai"}

@app.post("/extract-data", response_model=ExtractDataResponse)
async def extract_data(request: ExtractDataRequest):
    """Extract data from URLs or generate synthetic data"""
    try:
        all_data = []
        tables_found = 0
        
        # If URLs provided, scrape them
        if request.urls:
            for url in request.urls:
                result = scraper.scrape_url(url)
                all_data.append(result)
                tables_found += len(result.get('tables', []))
        
        # If no URLs or insufficient data, generate synthetic data
        if len(all_data) < request.num_rows:
            synthetic_data = scraper.generate_synthetic_data(request.prompt, request.num_rows)
            all_data.extend(synthetic_data)
        
        # Convert to DataFrame and then to CSV
        if all_data:
            df = pd.DataFrame(all_data)
            csv_data = df.to_csv(index=False)
        else:
            csv_data = "No data available"
        
        feedback = f"Successfully processed {len(all_data)} items. Found {tables_found} tables."
        
        return ExtractDataResponse(
            success=True,
            data=all_data[:request.num_rows],
            csv=csv_data,
            tables_found=tables_found,
            feedback=feedback
        )
        
    except Exception as e:
        return ExtractDataResponse(
            success=False,
            data=[],
            csv="",
            tables_found=0,
            feedback=f"Error: {str(e)}"
        )

# Vercel handler
def handler(request, response):
    """Vercel serverless function handler"""
    return app(request, response)