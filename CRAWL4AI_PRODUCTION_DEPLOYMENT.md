# Crawl4AI Production Deployment Guide

## 🚀 How Crawl4AI Works in Production

### **Architecture:**
```
Next.js App (Vercel)  ←→  Crawl4AI Service (Separate Server)
     ↓                           ↓
  Frontend UI              Web Scraping Engine
  API Routes               Selenium + BeautifulSoup
  Data Processing          Real-time Data Extraction
```

## 📋 Deployment Options

### **Option 1: Railway (Recommended - Easiest)**

1. **Create Railway Account:**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy Crawl4AI Service:**
   ```bash
   # Create new project on Railway
   # Connect your GitHub repo
   # Select the crawl4ai-python folder
   ```

3. **Environment Variables in Railway:**
   ```bash
   PORT=8000
   PYTHON_VERSION=3.9
   ```

4. **Update Next.js Environment:**
   ```bash
   CRAWL4AI_SERVICE_URL=https://your-app.railway.app
   ```

### **Option 2: Render (Free Tier Available)**

1. **Create Render Account:**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Deploy as Web Service:**
   ```yaml
   # render.yaml
   services:
     - type: web
       name: crawl4ai-service
       env: python
       buildCommand: pip install -r requirements.txt
       startCommand: python main.py
       envVars:
         - key: PORT
           value: 8000
   ```

3. **Update Environment:**
   ```bash
   CRAWL4AI_SERVICE_URL=https://your-app.onrender.com
   ```

### **Option 3: DigitalOcean App Platform**

1. **Create App Spec:**
   ```yaml
   # .do/app.yaml
   name: crawl4ai-service
   services:
     - name: web
       source_dir: src/lib/crawl4ai-python
       github:
         repo: your-username/your-repo
         branch: main
       run_command: python main.py
       environment_slug: python
       instance_count: 1
       instance_size_slug: basic-xxs
       envs:
         - key: PORT
           value: "8000"
   ```

### **Option 4: AWS EC2 (Advanced)**

1. **Launch EC2 Instance:**
   ```bash
   # Ubuntu 20.04 LTS
   # t3.medium or larger
   # Security group: Allow port 8000
   ```

2. **Install Dependencies:**
   ```bash
   sudo apt update
   sudo apt install python3-pip python3-venv
   sudo apt install chromium-browser
   ```

3. **Deploy Service:**
   ```bash
   git clone your-repo
   cd your-repo/src/lib/crawl4ai-python
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python main.py
   ```

4. **Use PM2 for Process Management:**
   ```bash
   npm install -g pm2
   pm2 start main.py --name crawl4ai --interpreter python3
   pm2 startup
   pm2 save
   ```

## 🔧 Production Configuration

### **1. Update Environment Variables:**

```bash
# In your .env.local or Vercel environment
CRAWL4AI_SERVICE_URL=https://your-crawl4ai-server.com

# Optional: Add authentication
CRAWL4AI_API_KEY=your_secret_key_here
```

### **2. Add Authentication (Optional):**

Update the Python service to require API key:

```python
# In main.py
import os
from fastapi import Header, HTTPException

@app.post("/extract-data")
async def extract_data(
    request: ExtractDataRequest,
    authorization: str = Header(None)
):
    # Check API key
    api_key = os.getenv("CRAWL4AI_API_KEY")
    if api_key and authorization != f"Bearer {api_key}":
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # ... rest of the function
```

Update TypeScript service:

```typescript
// In crawl4ai-service.ts
const response = await fetch(`${this.baseUrl}/extract-data`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.CRAWL4AI_API_KEY}`
  },
  body: JSON.stringify(request)
});
```

### **3. Health Check Integration:**

The service already has a health check endpoint at `/health`. Your Next.js app can monitor it:

```typescript
// Check if Crawl4AI service is available
const isHealthy = await crawl4aiService.healthCheck();
if (!isHealthy) {
  // Fallback to AI-only generation
  console.warn('Crawl4AI service unavailable, using AI fallback');
}
```

## 🐳 Docker Deployment (Advanced)

### **1. Create Dockerfile:**

```dockerfile
# Dockerfile
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "main.py"]
```

### **2. Deploy with Docker:**

```bash
# Build image
docker build -t crawl4ai-service .

# Run container
docker run -p 8000:8000 -e PORT=8000 crawl4ai-service

# Or use docker-compose
docker-compose up -d
```

## 🔍 Monitoring & Debugging

### **1. Health Check Endpoint:**
```bash
curl https://your-crawl4ai-server.com/health
```

### **2. Logs:**
```bash
# Railway
railway logs

# Render
# Check dashboard logs

# AWS EC2
pm2 logs crawl4ai
```

### **3. Test Connection:**
```bash
curl -X POST https://your-crawl4ai-server.com/extract-data \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://example.com"],
    "prompt": "test data",
    "num_rows": 5
  }'
```

## 🚨 Common Issues & Solutions

### **1. Chrome Driver Issues:**
```python
# Add to main.py
chrome_options.add_argument("--headless")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.add_argument("--disable-gpu")
```

### **2. Memory Issues:**
```python
# Add memory management
chrome_options.add_argument("--memory-pressure-off")
chrome_options.add_argument("--max_old_space_size=4096")
```

### **3. Timeout Issues:**
```python
# Increase timeouts
WebDriverWait(self.driver, 30).until(...)
response = requests.get(url, timeout=30)
```

## 📊 Performance Optimization

### **1. Connection Pooling:**
```python
# Use connection pooling for requests
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

session = requests.Session()
retry_strategy = Retry(
    total=3,
    backoff_factor=1,
    status_forcelist=[429, 500, 502, 503, 504],
)
adapter = HTTPAdapter(max_retries=retry_strategy)
session.mount("http://", adapter)
session.mount("https://", adapter)
```

### **2. Caching:**
```python
# Add Redis caching for frequently scraped URLs
import redis
import hashlib

redis_client = redis.Redis(host='localhost', port=6379, db=0)

def get_cached_data(url, prompt):
    cache_key = hashlib.md5(f"{url}:{prompt}".encode()).hexdigest()
    return redis_client.get(cache_key)
```

## ✅ Production Checklist

- [ ] Crawl4AI service deployed and accessible
- [ ] Environment variables configured
- [ ] Health check endpoint working
- [ ] Authentication implemented (optional)
- [ ] Monitoring set up
- [ ] Error handling tested
- [ ] Performance optimized
- [ ] Security measures in place
- [ ] Backup strategy implemented
- [ ] Documentation updated

## 🎯 Recommended Production Setup

**For Most Users:**
1. **Railway** for Crawl4AI service (easiest)
2. **Vercel** for Next.js app
3. **Supabase** for database
4. **Environment variables** for configuration

**For Enterprise:**
1. **AWS ECS** for Crawl4AI service
2. **Vercel** for Next.js app
3. **AWS RDS** for database
4. **CloudWatch** for monitoring
5. **API Gateway** for rate limiting

This setup gives you a robust, scalable web scraping service that works seamlessly with your Next.js application in production!
