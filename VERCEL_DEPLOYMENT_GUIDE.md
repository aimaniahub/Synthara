# Vercel Deployment Guide - Both Frontend & Backend

This guide covers deploying both the Next.js frontend and Python FastAPI backend on Vercel as serverless functions.

## 🏗️ Architecture Overview

```
Vercel Deployment:
├── Next.js Frontend (Next.js App Router)
│   ├── Pages: /, /dashboard, /auth, etc.
│   └── API Routes: /api/generate-stream, /api/health, etc.
└── Python Backend (FastAPI Serverless Functions)
    ├── /api/crawl4ai/extract-data
    ├── /api/crawl4ai/health
    └── /api/crawl4ai/ (root)
```

## 📁 Project Structure

```
synthara-1/
├── api/                          # Python FastAPI Backend
│   ├── main.py                   # FastAPI application
│   └── requirements.txt          # Python dependencies
├── src/                          # Next.js Frontend
│   ├── app/                      # App Router pages
│   ├── components/               # React components
│   ├── services/                 # TypeScript services
│   └── lib/                      # Utilities
├── vercel.json                   # Vercel configuration
├── package.json                  # Node.js dependencies
└── next.config.ts               # Next.js configuration
```

## 🚀 Deployment Steps

### 1. Prerequisites

- Vercel account
- GitHub repository
- Environment variables ready

### 2. Environment Variables

Set these in Vercel Dashboard → Project Settings → Environment Variables:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_GEMINI_API_KEY=your_gemini_key
SERPAPI_KEY=your_serpapi_key

# Optional
OPENAI_API_KEY=your_openai_key
NEXTAUTH_SECRET=your_nextauth_secret
```

### 3. Vercel Configuration

The `vercel.json` file is already configured:

```json
{
  "builds": [
    {
      "src": "api/main.py",
      "use": "@vercel/python"
    },
    {
      "src": "package.json", 
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/crawl4ai/(.*)",
      "dest": "api/main.py"
    },
    {
      "src": "/(.*)",
      "dest": "/"
    }
  ]
}
```

### 4. Deploy to Vercel

#### Option A: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### Option B: GitHub Integration
1. Push code to GitHub
2. Connect repository to Vercel
3. Vercel will auto-deploy on push

### 5. Verify Deployment

After deployment, test these endpoints:

- **Frontend**: `https://your-app.vercel.app/`
- **Python API**: `https://your-app.vercel.app/api/crawl4ai/`
- **Health Check**: `https://your-app.vercel.app/api/crawl4ai/health`

## 🔧 How It Works

### Frontend (Next.js)
- Deployed as Vercel's optimized Next.js runtime
- API routes in `src/app/api/` become serverless functions
- Static assets served from CDN

### Backend (Python FastAPI)
- Deployed as Vercel Python serverless functions
- Located in `api/` directory
- Routes to `/api/crawl4ai/*` handled by Python

### Communication
- Frontend calls `/api/crawl4ai/extract-data`
- Vercel routes this to Python FastAPI function
- Python processes request and returns JSON
- Frontend receives response and updates UI

## 📊 Performance & Scaling

### Automatic Scaling
- Both services scale automatically based on demand
- Cold starts: ~100-500ms for Python functions
- Next.js: Near-instant response times

### Limits
- **Python Functions**: 10s execution time (free), 60s (pro)
- **Next.js**: 10s execution time (free), 60s (pro)
- **Bandwidth**: 100GB/month (free), 1TB (pro)

### Optimization
- Python functions are stateless (no persistent connections)
- Next.js uses static generation where possible
- Images optimized via Vercel's image optimization

## 🐛 Troubleshooting

### Common Issues

1. **Python Import Errors**
   - Check `requirements.txt` has all dependencies
   - Ensure imports are compatible with Vercel's Python runtime

2. **API Route Not Found**
   - Verify `vercel.json` routes configuration
   - Check function is in correct directory (`api/`)

3. **Environment Variables**
   - Ensure all required variables are set in Vercel dashboard
   - Check variable names match exactly

4. **Build Failures**
   - Check Vercel build logs for specific errors
   - Ensure all dependencies are compatible

### Debug Commands

```bash
# Test locally
vercel dev

# Check build locally
vercel build

# View logs
vercel logs
```

## 🔄 Development Workflow

### Local Development
```bash
# Start Next.js frontend
npm run dev

# Start Python backend (if needed locally)
cd api
python -m uvicorn main:app --reload --port 8000
```

### Production Deployment
```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## 📈 Monitoring

### Vercel Dashboard
- Function execution times
- Error rates
- Bandwidth usage
- Build logs

### Application Monitoring
- Built-in health checks at `/api/health`
- Crawl4AI health at `/api/crawl4ai/health`
- Error tracking in console logs

## 🚀 Benefits of This Setup

1. **Single Platform**: Both services on Vercel
2. **Automatic Scaling**: Handles traffic spikes
3. **Global CDN**: Fast worldwide access
4. **Zero Configuration**: Works out of the box
5. **Cost Effective**: Pay only for usage
6. **Easy Deployment**: Git-based deployments

## 🔐 Security

- Environment variables encrypted at rest
- HTTPS enforced automatically
- Security headers configured in `vercel.json`
- CORS handled by Vercel
- No server management required

## 📝 Next Steps

1. Deploy to Vercel
2. Test all functionality
3. Set up monitoring
4. Configure custom domain (optional)
5. Set up CI/CD pipeline (optional)

Your application is now ready for production with both frontend and backend running on Vercel! 🎉
