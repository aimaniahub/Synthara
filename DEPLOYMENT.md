# Synthara AI - Vercel Deployment Guide

## 🚀 Quick Deploy to Vercel

### Option 1: Deploy with Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via GitHub Integration

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js and configure everything

## 🔧 Environment Variables Setup

In your Vercel dashboard, add these environment variables:

### Required Variables
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key
SERPAPI_API_KEY=your_serpapi_key
FIRECRAWL_API_KEY=your_firecrawl_api_key
PREFERRED_AI_MODEL=anthropic/claude-3-5-sonnet-20241022
```

### Optional Variables
```
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
NODE_ENV=production
VERCEL=1
VERCEL_ENV=production
```

## 📋 Pre-Deployment Checklist

- [ ] All environment variables configured in Vercel dashboard
- [ ] Build passes locally (`npm run build`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] All API routes tested
- [ ] Database migrations completed (if any)
- [ ] Domain configured (if using custom domain)

## 🔍 Vercel Configuration

The project includes:
- `vercel.json` - Vercel deployment configuration
- `next.config.ts` - Optimized for Vercel
- `.vercelignore` - Files to exclude from deployment

## 🌐 Post-Deployment

1. **Verify deployment** at your Vercel URL
2. **Test all features** including:
   - Authentication flow
   - Data generation
   - Web scraping functionality
   - AI model responses
3. **Configure custom domain** (optional)
4. **Set up monitoring** and analytics

## 🛠 Troubleshooting

### Build Errors
- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Ensure environment variables are set

### Runtime Errors
- Check function logs in Vercel dashboard
- Verify API keys are correct
- Check database connectivity

### Performance Issues
- Monitor function execution times
- Optimize images and assets
- Use Vercel Analytics for insights

## 📊 Vercel Features Enabled

- ✅ Automatic deployments from Git
- ✅ Preview deployments for PRs
- ✅ Edge functions for API routes
- ✅ Image optimization
- ✅ Static file caching
- ✅ Security headers
- ✅ Performance monitoring
