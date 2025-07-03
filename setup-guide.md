# 🚀 Synthara AI - Quick Setup Guide

## Prerequisites
- Node.js 18+ installed
- npm 8+ installed
- API keys for the required services

## 📋 Required API Keys

| Service | Purpose | Get API Key | Cost |
|---------|---------|-------------|------|
| **Supabase** | Database & Auth | [supabase.com](https://supabase.com) | Free tier available |
| **OpenRouter** | AI Model (DeepSeek) | [openrouter.ai](https://openrouter.ai) | Free tier available |
| **SerpAPI** | Web Search | [serpapi.com](https://serpapi.com) | Free tier: 100 searches/month |
| **Firecrawl** | Web Scraping | [firecrawl.dev](https://firecrawl.dev) | Free tier available |

## 🛠 Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
1. Open `.env.local` file (already created)
2. Replace all `YOUR_*_HERE` placeholders with your actual API keys
3. Save the file

### 3. Set up Supabase (Required)
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → API
3. Copy your Project URL and anon key to `.env.local`
4. Copy your service role key to `.env.local`

### 4. Set up AI Services
**OpenRouter (DeepSeek Chat V3):**
1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Create an API key
3. Add to `.env.local` as `OPENROUTER_API_KEY`

### 5. Set up Web Scraping Services
**SerpAPI:**
1. Sign up at [serpapi.com](https://serpapi.com)
2. Get your API key from dashboard
3. Add to `.env.local` as `SERPAPI_API_KEY`

**Firecrawl:**
1. Sign up at [firecrawl.dev](https://firecrawl.dev)
2. Get your API key
3. Add to `.env.local` as `FIRECRAWL_API_KEY`

### 6. Run the Application
```bash
npm run dev
```

### 7. Test the Setup
1. Open http://localhost:3000
2. Sign up for an account
3. Try generating a dataset
4. Verify web scraping works

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run typecheck

# Clean build artifacts
npm run clean
```

## 🆘 Troubleshooting

### Common Issues:
1. **Build errors**: Check that all API keys are set in `.env.local`
2. **Auth not working**: Verify Supabase configuration
3. **AI generation fails**: Check OpenRouter API key and model configuration
4. **Web scraping fails**: Verify SerpAPI and Firecrawl keys

### Getting Help:
- Check the console for error messages
- Verify all environment variables are set correctly
- Ensure your development server was restarted after changing `.env.local`
- Check API key quotas and limits

## 🌟 Next Steps
Once setup is complete:
1. Explore the dashboard at `/dashboard`
2. Try generating different types of datasets
3. Experiment with web scraping features
4. Check out the help center at `/help`

Happy data generating! 🎉
