# Synthara - AI-Powered Web Data Generation Platform

Synthara is a comprehensive web application that generates structured datasets using AI and real-time web data. The platform combines web scraping, AI processing, and intelligent data structuring to create high-quality datasets for various use cases.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- Supabase account
- API keys for AI services

### Installation
```bash
git clone <repository-url>
cd Synthara-1
npm install
```

### Environment Setup
Create `.env.local` with your API keys:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
GOOGLE_GEMINI_API_KEY=your_gemini_key
SERPAPI_KEY=your_serpapi_key

# Optional
OPENAI_API_KEY=your_openai_key
CRAWL4AI_SERVICE_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Run the Application
```bash
# Start the application
npm run dev

# Or use the batch file (Windows)
start.bat
```

Visit `http://localhost:3000` to access the application.

## 🏗️ Architecture Overview

- **Frontend**: Next.js 15.3.3 with App Router
- **Backend**: Next.js API routes with TypeScript
- **Database**: Supabase (PostgreSQL with RLS)
- **AI Services**: Google Gemini 2.0 Flash, SerpAPI
- **Web Scraping**: Crawl4AI Python microservice
- **Deployment**: Vercel-optimized configuration

## 🔧 Core Features

### 1. Intelligent Data Generation
- **AI-Powered Refinement**: Converts natural language prompts into effective search queries
- **Web Data Collection**: Performs intelligent web searches using optimized queries
- **Content Processing**: AI analyzes scraped content to identify relevant information
- **Data Structuring**: Creates structured datasets with appropriate column schemas

### 2. Real-Time Processing
- **Live Progress Tracking**: Real-time logging of each processing step
- **Streaming Data Generation**: Server-sent events for real-time progress updates
- **Transparent Processing**: Clear indication of data sources and generation methods

### 3. User Management
- **Authentication**: Supabase Auth with email/password
- **User Profiles**: Complete user management system
- **Data History**: Track and manage generated datasets

## 🛠️ Technology Stack

### Frontend Technologies
- **Next.js 14**: React-based full-stack framework with App Router
- **TypeScript**: Type-safe development environment
- **Tailwind CSS**: Utility-first CSS framework with shadcn/ui components
- **React Hook Form + Zod**: Form state management and validation

### Backend and AI Integration
- **Google Gemini**: Primary AI service for content processing
- **SerpAPI**: Web search functionality
- **Crawl4AI**: Web scraping service (Python microservice)
- **Supabase**: Database and authentication

### Data Processing
- **Zod Schema Validation**: Runtime type checking and validation
- **CSV Generation**: Structured data export functionality
- **Real-time Updates**: Live progress tracking and status updates

## 📊 Data Generation Pipeline

### Web Data Extraction
1. **Search Optimization**: Refine user queries for better web search results
2. **Source Filtering**: Select high-quality, reliable web sources
3. **Content Scraping**: Extract text, tables, and structured data
4. **AI Analysis**: Process scraped content to identify relevant information
5. **Structure Creation**: Generate appropriate dataset schema and populate with real data

### Processing Flow
**Input Validation → Query Optimization → Web Search → Content Scraping → AI Analysis → Data Structuring → Export Generation**

## 🗄️ Database Setup (Supabase)

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `synthara-ai` (or your preferred name)
   - **Database Password**: Generate a strong password and save it
   - **Region**: Choose the closest region to your users
5. Click "Create new project"
6. Wait for the project to be created (this may take a few minutes)

### Step 2: Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

### Step 3: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase-complete-schema.sql` from your project
4. Paste it into the SQL Editor
5. Click "Run" to execute the schema

This will create:
- `user_activities` table for logging user actions
- `generated_datasets` table for storing CSV data and metadata
- `user_profiles` table for user information
- `file_storage` table for file tracking
- All necessary indexes and security policies

### Step 4: Configure Authentication

1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Configure your site URL:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add `http://localhost:3000/auth/callback`
3. Go to **Authentication** → **Providers**
4. Enable the providers you want to use:
   - **Email**: Enable for email/password authentication
   - **Google**: Enable if you want Google OAuth
   - **GitHub**: Enable if you want GitHub OAuth

### Step 5: Set Up File Storage (Optional)

1. In your Supabase dashboard, go to **Storage**
2. You should see a `datasets` bucket created by the schema
3. If not, create a new bucket:
   - **Name**: `datasets`
   - **Public**: No (private bucket)
   - **File size limit**: 50MB (or your preferred limit)

### Step 6: Test Your Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Go to `http://localhost:3000`

3. Try to:
   - Sign up for a new account
   - Generate some data
   - Save a dataset
   - Check the history page

4. Verify in Supabase dashboard:
   - **Authentication** → **Users**: Should see your test user
   - **Table Editor** → **user_activities**: Should see activity logs
   - **Table Editor** → **generated_datasets**: Should see saved datasets

## 🐳 Crawl4AI Service Setup

The web scraping service needs to be deployed separately. Here are the deployment options:

### Option 1: Railway (Recommended)
1. Create account at [railway.app](https://railway.app)
2. Deploy the `src/lib/crawl4ai-python` folder
3. Set environment variables: `PORT=8000`
4. Update `CRAWL4AI_SERVICE_URL` in your main app

### Option 2: Render
1. Create account at [render.com](https://render.com)
2. Deploy as web service with Python environment
3. Configure build and start commands

### Option 3: AWS EC2
1. Launch Ubuntu 20.04 LTS instance
2. Install Python and Chrome dependencies
3. Deploy using PM2 for process management

### Option 4: Docker (Local Development)

#### Access Container Terminal
```bash
# Get a shell inside the running container
docker exec -it crawal_service /bin/bash

# Or use sh if bash is not available
docker exec -it crawal_service /bin/sh
```

#### Copy Files to Container
```bash
# Copy a single file
docker cp local-file.txt crawal_service:/path/in/container/

# Copy entire directory
docker cp ./local-directory/ crawal_service:/path/in/container/

# Copy from container to local
docker cp crawal_service:/path/in/container/file.txt ./local-file.txt
```

#### Update Container with New Image
```bash
# Stop current container
docker stop crawal_service

# Remove old container
docker rm crawal_service

# Run new container with proper port mapping
docker run -d \
  --name crawal_service \
  -p 8000:6379 \
  -p 11235:11235 \
  -p 11234:11234 \
  unclecode/crawl4ai:latest
```

#### Mount Local Directory (for development)
```bash
# Run container with local directory mounted
docker run -d \
  --name crawal_service \
  -p 8000:6379 \
  -p 11235:11235 \
  -p 11234:11234 \
  -v /path/to/your/local/code:/app/code \
  unclecode/crawl4ai:latest
```

#### Check Container Status
```bash
# List running containers
docker ps

# Check container logs
docker logs crawal_service

# Check container details
docker inspect crawal_service
```

#### Restart Services Inside Container
```bash
# Access container
docker exec -it crawal_service /bin/bash

# Restart specific services
supervisorctl restart gunicorn
supervisorctl restart redis
supervisorctl restart mcp_server

# Or restart all services
supervisorctl restart all
```

## 🚀 Deployment

### Vercel Deployment (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Production Deployment Checklist

#### Pre-Deployment
- [x] Environment variables configured
- [x] Database schema applied
- [x] API keys obtained and tested
- [x] Build process verified
- [x] TypeScript compilation successful

#### Post-Deployment
- [ ] Health check endpoint tested
- [ ] Authentication flow verified
- [ ] Data generation working
- [ ] Web scraping functional
- [ ] File downloads working
- [ ] Error handling verified

## 🔐 Security Features

- **Authentication**: Supabase Auth with JWT tokens
- **Data Protection**: Row Level Security (RLS) enabled
- **API Validation**: Input sanitization and validation
- **Environment Security**: Secure API key management

## 📋 Environment Variables

### Required Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
GOOGLE_GEMINI_API_KEY=your_gemini_key
SERPAPI_KEY=your_serpapi_key
```

### Optional Variables
```bash
OPENAI_API_KEY=your_openai_key
CRAWL4AI_SERVICE_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 🎯 Key Features

1. **Intelligent Data Generation**: AI-powered synthetic data creation
2. **Web Scraping**: Real-time data extraction from web sources
3. **User Management**: Complete authentication and user profiles
4. **Data Visualization**: Interactive data preview and analysis
5. **Export Functionality**: CSV and JSON download options
6. **Responsive Design**: Mobile and desktop optimized
7. **Real-time Updates**: Live progress tracking and logging
8. **Security**: Enterprise-grade security measures

## 📈 Performance Optimizations

- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js image component with WebP/AVIF
- **Caching**: Proper cache headers and strategies
- **Bundle Size**: Optimized dependencies and tree shaking
- **Database**: Indexed queries and RLS optimization

## 🔍 Monitoring & Health Checks

The application includes comprehensive health check endpoints:
- **Database**: Connection status check
- **Services**: AI and search service status
- **Overall**: System health monitoring

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
├── components/             # React components
├── ai/                    # AI processing flows
├── services/              # External service integrations
├── lib/                   # Utility functions and configurations
└── hooks/                 # Custom React hooks
```

## 🛠️ Troubleshooting

### Common Issues:

1. **"Database tables not set up" error**:
   - Make sure you ran the complete schema SQL
   - Check that all tables exist in the Table Editor

2. **Authentication not working**:
   - Verify your Supabase URL and anon key are correct
   - Check that authentication is enabled in Supabase dashboard
   - Ensure redirect URLs are configured correctly

3. **Data not saving**:
   - Check browser console for errors
   - Verify environment variables are loaded correctly
   - Check Supabase logs in the dashboard

4. **RLS (Row Level Security) errors**:
   - Make sure you're authenticated
   - Check that RLS policies are created correctly
   - Verify user ID matches in the database

### Debug Steps:

1. Check browser console for errors
2. Check Supabase dashboard logs
3. Verify environment variables are loaded:
   ```javascript
   console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
   console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
1. Check the documentation
2. Review the health check endpoints
3. Check environment variable configuration
4. Review the logs for error details

---

**Synthara** combines the power of AI with real-time web data to create a unique dataset generation experience that adapts to user needs while maintaining transparency about data sources and generation methods.