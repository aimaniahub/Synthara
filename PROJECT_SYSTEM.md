# Synthara AI - Complete Project System Documentation

## 🎯 Project Overview

**Synthara** is an AI-powered web scraping and dataset generation platform that transforms natural language queries into structured datasets. Built with Next.js 15, TypeScript, and a sophisticated AI pipeline, it combines intelligent search, web scraping, AI structuring, and secure data storage.

### Core Value Proposition
- **Input**: Natural language query (e.g., "Top EV charging operators in India with station counts by city")
- **Process**: AI-enhanced search → Web scraping → Content extraction → AI structuring
- **Output**: Clean, structured CSV datasets with proper schema

---

## 🏗️ Architecture Overview

### Technology Stack

#### Frontend & Backend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Authentication**: Supabase Auth (email/password)
- **Database**: Supabase PostgreSQL with Row Level Security
- **File Storage**: Supabase Storage buckets

#### AI & Services
- **Primary AI**: OpenRouter DeepSeek (via SimpleAI wrapper)
- **Secondary AI**: Google Gemini 2.5 Flash (with multi-key rotation)
- **Search**: SerpAPI for URL discovery
- **Web Scraping**: Crawl4AI Python microservice
- **Embeddings**: Token-budgeted chunking system

#### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Deployment**: Vercel (frontend) + Railway/Render (Python services)
- **Development**: Local with Docker services

---

## 🔄 Core Data Generation Workflow

### 1. Input Validation & Enhancement
```typescript
// Input schema validation
const IntelligentWebScrapingInputSchema = z.object({
  userQuery: z.string().min(1),
  numRows: z.number().min(1).max(300).default(300),
  maxUrls: z.number().min(1).max(15).default(15),
  useAI: z.boolean().default(true),
  sessionId: z.string().optional(),
});
```

### 2. Search URL Generation
- **Service**: `generateSearchUrls` flow
- **Process**: 
  - Gemini generates 2 diverse search queries
  - SerpAPI searches with geographic preferences
  - Over-fetches 3x requested URLs for quality
  - Filters out Google SERP, social media, Wikipedia main pages

### 3. Web Scraping Orchestration
- **Service**: Crawl4AI Python microservice
- **Process**:
  - Batch processing (5 URLs per batch)
  - Retry logic with exponential backoff
  - Backfill queue for failed scrapes
  - Markdown + table extraction
  - Content cleaning and deduplication

### 4. Content Chunking & Retrieval
- **Strategy**: Token-budgeted chunking
- **Process**:
  - 1500-character chunks with 200-character overlap
  - Relevance scoring against query terms
  - 170k character budget per AI call
  - Sequential slice processing for large corpora

### 5. AI Structuring
- **Primary Path**: Crawl4AI + Gemini structured extraction
- **Fallback Path**: SimpleAI (OpenRouter DeepSeek) chunked processing
- **Output**: JSON schema + data rows with aggressive error recovery

### 6. Post-processing & Export
- **Schema inference**: Automatic type detection (string/number/date/boolean)
- **Row normalization**: Consistent column mapping
- **File generation**: CSV export to `/output` directory
- **Database storage**: Supabase with user association

---

## 🧩 Key Service Components

### SimpleAI Service (`src/ai/simple-ai.ts`)
```typescript
export class SimpleAI {
  // OpenRouter DeepSeek integration
  static async generate(input: SimpleAIInput): Promise<SimpleAIOutput>
  
  // Schema-constrained generation with JSON recovery
  static async generateWithSchema<T>(input: SimpleAIInput & { schema: any }): Promise<T>
  
  // Main dataset structuring method
  static async structureRelevantChunksToDataset(input: StructureRelevantChunksInput): Promise<StructuredDataset>
}
```

**Key Features**:
- Raw response persistence for debugging
- Multi-strategy JSON parsing and recovery
- Token budget management (170k chars max)
- Session-based file organization

### Gemini Service (`src/services/gemini-service.ts`)
```typescript
export class GeminiService {
  // Multi-key rotation with automatic failover
  private apiKeys: string[] = [];
  private keyIndex: number = 0;
  
  // Search query generation
  async generateSearchQueries(userQuery: string): Promise<GeminiSearchQueriesResponse>
  
  // Content refinement and noise removal
  async refineContent(scrapedContent: Array<{url: string, title: string, content: string}>, userQuery: string): Promise<GeminiContentRefinementResponse>
  
  // Data structuring with schema design
  async structureData(refinedContent: GeminiRefinedContent[], userQuery: string, numRows: number): Promise<GeminiDataStructuringResponse>
}
```

**Key Features**:
- API key rotation on 429/401/403 errors
- Robust JSON extraction from markdown
- Retry logic with exponential backoff
- Content chunking for token limits

### SerpAPI Service (`src/services/serpapi-service.ts`)
```typescript
export class SerpAPIService {
  // Single query search
  async searchUrls(query: string, maxResults: number = 10): Promise<SerpAPISearchResponse>
  
  // Multi-query search with deduplication
  async searchMultipleQueries(queries: string[], maxResultsPerQuery: number = 5): Promise<SerpAPISearchResponse>
}
```

**Key Features**:
- Geographic preference detection (India for NSE/BSE queries)
- URL deduplication and domain extraction
- Rate limiting with delays between requests

### Crawl4AI Service (`src/services/crawl4ai-service.ts`)
```typescript
class Crawl4AIService {
  // Health check for service availability
  async health(timeoutMs: number = 5000): Promise<boolean>
  
  // Structured extraction with LLM integration
  async extractStructured(urls: string[], options: Crawl4AIExtractOptions): Promise<{success: boolean; results: Crawl4AIStructuredResult[]}>
  
  // Bulk processing with batching
  async extractStructuredBulk(urls: string[], options: Crawl4AIExtractOptions): Promise<{success: boolean; results: Crawl4AIStructuredResult[]}>
}
```

---

## 🗄️ Database Schema

### Core Tables

#### `generated_datasets`
```sql
CREATE TABLE public.generated_datasets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dataset_name VARCHAR(255) NOT NULL,
    prompt_used TEXT NOT NULL,
    num_rows INTEGER NOT NULL DEFAULT 0,
    schema_json JSONB NOT NULL,
    data_csv TEXT NOT NULL,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `user_activities`
```sql
CREATE TABLE public.user_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'COMPLETED',
    related_resource_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `user_profiles`
```sql
CREATE TABLE public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);
```

#### `file_storage`
```sql
CREATE TABLE public.file_storage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    file_path TEXT NOT NULL,
    storage_bucket VARCHAR(100) DEFAULT 'datasets',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Security Features
- **Row Level Security (RLS)** enabled on all tables
- **User isolation** through `auth.uid()` policies
- **Automatic profile creation** on user signup
- **Secure file storage** with user-scoped access

---

## 🐳 Docker Configuration

### Main Application Dockerfile
```dockerfile
# Multi-stage build for Next.js
FROM node:18-alpine AS base
FROM base AS deps
# Install dependencies
FROM base AS builder
# Build application
FROM base AS runner
# Production runtime
```

### Docker Compose Setup
```yaml
version: '3.8'
services:
  synthara-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - CRAWL4AI_SERVICE_URL=http://crawl4ai:8000
    networks:
      - synthara-network

  crawl4ai:
    image: unclecode/crawl4ai:latest
    ports:
      - "8000:8000"
      - "11234:11234"
      - "11235:11235"
    networks:
      - synthara-network
```

### Crawl4AI Python Service
```python
# FastAPI service for web scraping
@app.post("/extract", response_model=ExtractResponse)
async def extract(req: ExtractRequest) -> ExtractResponse:
    # Supports OpenAI and Gemini providers
    # Chunked text processing
    # JSON extraction and validation
```

---

## 🔧 Environment Configuration

### Required Environment Variables

#### Supabase (Authentication & Database)
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### AI Services
```bash
# Multi-key Gemini setup with rotation
GOOGLE_GEMINI_API_KEYS=key1,key2,key3

# OpenRouter for DeepSeek
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=tngtech/deepseek-r1t2-chimera:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Search API
SERPAPI_KEY=your_serpapi_key
```

#### Services
```bash
# Crawl4AI microservice
CRAWL4AI_SERVICE_URL=http://localhost:8000

# Optional trainer service
PY_TRAINER_API_KEY=your_trainer_key
PY_TRAINER_BASE_URL=http://localhost:8001
```

#### Application
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

---

## 🎨 UI Components & Pages

### Page Structure
```
src/app/
├── (auth)/           # Authentication pages
├── api/              # API routes (26 endpoints)
├── auth/             # Auth callback handling
├── dashboard/        # Protected dashboard pages
│   ├── analysis/     # Data analysis tools
│   ├── generate/     # Dataset generation
│   ├── history/      # User's dataset history
│   └── train/        # ML training interface
├── help/             # Documentation
├── layout.tsx        # Root layout with theme provider
└── page.tsx          # Landing page
```

### Key UI Features
- **Responsive design** with Tailwind CSS
- **Dark/light theme** support
- **Real-time progress** via Server-Sent Events
- **Clean typography** with Inter + Space Grotesk fonts
- **Accessible components** using Radix UI primitives

### Landing Page Highlights
- **Hero section** with clear value proposition
- **Feature showcase** with icons and descriptions
- **Use case examples** for different industries
- **Team section** highlighting student developers
- **Responsive navigation** with auth state awareness

---

## 🔄 Development Workflow

### Local Development Setup

1. **Clone and Install**
```bash
git clone <repository-url>
cd Synthara
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env.local
# Fill in your API keys and configuration
```

3. **Database Setup**
```bash
# Run Supabase schema
npm run setup:db
```

4. **Start Services**
```bash
# Start Crawl4AI service
docker run -p 8000:8000 unclecode/crawl4ai:latest

# Start Next.js development server
npm run dev

# Or use Docker Compose
docker-compose up
```

### Key Development Scripts
```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "setup:db": "node scripts/setup-database.js"
}
```

---

## 🚀 Deployment Strategy

### Frontend Deployment (Vercel)
- **Platform**: Vercel with Next.js optimization
- **Build**: Automatic from Git commits
- **Environment**: Production environment variables
- **Features**: Image optimization, edge functions, analytics

### Backend Services
- **Crawl4AI**: Railway, Render, or AWS EC2
- **Database**: Supabase hosted PostgreSQL
- **Storage**: Supabase Storage buckets
- **Monitoring**: Built-in logging and error tracking

### Deployment Checklist
1. ✅ Environment variables configured
2. ✅ Database schema applied
3. ✅ Storage buckets created
4. ✅ Crawl4AI service accessible
5. ✅ API keys valid and rotated
6. ✅ SSL certificates active
7. ✅ Monitoring and alerts configured

---

## 🔍 Key Features & Logic

### Intelligent Search Enhancement
- **Query Analysis**: Gemini analyzes user intent and generates diverse search queries
- **Geographic Awareness**: Detects regional preferences (India for NSE/BSE queries)
- **Source Diversification**: Ensures variety in data sources

### Robust Web Scraping
- **Anti-blocking**: User-agent rotation and request delays
- **Content Cleaning**: HTML to markdown conversion with noise removal
- **Retry Logic**: Exponential backoff with circuit breaker pattern
- **Quality Filtering**: Removes low-signal sources (SERP pages, social media)

### AI-Powered Structuring
- **Multi-Model Approach**: Primary (Crawl4AI+Gemini) and fallback (SimpleAI+DeepSeek) paths
- **Schema Intelligence**: Automatic column type inference and naming
- **Error Recovery**: Multiple JSON parsing strategies with graceful degradation
- **Token Management**: Intelligent chunking to stay within model limits

### Data Quality Assurance
- **Deduplication**: Row-level and URL-level duplicate removal
- **Validation**: Schema consistency and data type validation
- **Completeness**: Backfill strategies to reach target row counts
- **Traceability**: Full audit trail from source URLs to final rows

---

## 🛠️ Advanced Technical Details

### Chunking Strategy
```typescript
// Content chunking with overlap for context preservation
function buildContentChunksForRetrieval(
  scrapedContent: Array<{ url: string; title: string; content: string }>,
  maxChunkSize: number = 1500,
  overlap: number = 200
): ContentChunk[]
```

### AI Call Optimization
- **Budget Management**: 170k character limit per SimpleAI call
- **Parallel Processing**: Multiple chunk groups processed concurrently
- **Sequential Slicing**: Large documents split into non-overlapping slices
- **Progress Tracking**: Real-time updates via Server-Sent Events

### Error Handling & Recovery
- **API Key Rotation**: Automatic failover on rate limits
- **JSON Salvage**: Multiple parsing strategies for malformed responses
- **Partial Success**: Continue processing with available data
- **Graceful Degradation**: Fallback to simpler extraction methods

### File Management
```typescript
// Organized temporary file structure
temp/
├── ai-raw-response-*.json     # Raw AI responses for debugging
├── analyzed/                  # Session-based analysis files
├── chunks/                    # Chunked data for streaming
└── scraped-data-*.md         # Combined scraped content
```

---

## 🎯 Business Logic & Use Cases

### Target Industries
1. **Financial Services**: Stock data, market analysis, company information
2. **E-commerce**: Product catalogs, pricing data, review analysis
3. **Healthcare**: Medical device listings, clinical trial data, research papers
4. **Real Estate**: Property listings, market trends, agent information
5. **Technology**: Software tools, API documentation, tech company data

### Data Quality Metrics
- **Completeness**: Percentage of requested rows generated
- **Accuracy**: Validation against source content
- **Consistency**: Schema adherence and data type consistency
- **Freshness**: Timestamp tracking for data recency
- **Coverage**: Diversity of sources and geographic representation

### Scalability Considerations
- **Rate Limiting**: Built-in delays and backoff strategies
- **Resource Management**: Memory-efficient chunking and streaming
- **Concurrent Processing**: Parallel scraping with controlled concurrency
- **Storage Optimization**: Compressed storage and efficient indexing

---

## 🔐 Security & Privacy

### Data Protection
- **User Isolation**: RLS policies ensure data segregation
- **Secure Storage**: Encrypted file storage with access controls
- **API Security**: Rate limiting and authentication on all endpoints
- **Input Validation**: Comprehensive schema validation and sanitization

### Privacy Compliance
- **Data Minimization**: Only collect necessary information
- **User Control**: Full data download and deletion capabilities
- **Audit Logging**: Complete activity tracking for compliance
- **Secure Transmission**: HTTPS everywhere with secure headers

---

## 📊 Monitoring & Analytics

### Performance Metrics
- **Response Times**: API endpoint performance tracking
- **Success Rates**: Data generation completion rates
- **Error Patterns**: Common failure modes and recovery strategies
- **Resource Usage**: Memory, CPU, and storage utilization

### User Analytics
- **Usage Patterns**: Popular query types and data domains
- **Feature Adoption**: Dashboard section usage and engagement
- **Quality Feedback**: User satisfaction and data quality ratings
- **Growth Metrics**: User acquisition and retention tracking

---

## 🚀 Future Enhancements

### Planned Features
1. **Advanced Visualizations**: PowerBI-like chart generation
2. **ML Model Integration**: Automated model training and evaluation
3. **API Marketplace**: Public API for third-party integrations
4. **Collaborative Workspaces**: Team-based dataset sharing
5. **Real-time Data**: Live data feeds and streaming updates

### Technical Improvements
1. **Vector Search**: Semantic similarity for better content matching
2. **Caching Layer**: Redis for improved response times
3. **Microservices**: Service decomposition for better scalability
4. **GraphQL API**: More efficient data fetching
5. **Edge Computing**: Global CDN for faster access

---

## 📝 Getting Started Guide

### For Developers
1. **Study the Architecture**: Understand the data flow and service interactions
2. **Set Up Environment**: Configure all required API keys and services
3. **Run Local Development**: Start with Docker Compose for full stack
4. **Explore the Code**: Begin with `src/ai/flows/intelligent-web-scraping-flow.ts`
5. **Make Changes**: Follow the established patterns and conventions

### For Users
1. **Sign Up**: Create account via Supabase Auth
2. **Generate Dataset**: Describe your data needs in natural language
3. **Monitor Progress**: Watch real-time updates in the dashboard
4. **Download Results**: Get CSV files with structured data
5. **Analyze & Train**: Use built-in tools or export to external platforms

---

## 🤝 Contributing

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Next.js configuration with custom rules
- **Prettier**: Consistent code formatting
- **Testing**: Unit tests for critical business logic
- **Documentation**: Comprehensive inline comments

### Development Process
1. **Fork Repository**: Create your own copy
2. **Feature Branch**: Work on isolated feature branches
3. **Code Review**: Submit pull requests for review
4. **Testing**: Ensure all tests pass
5. **Deployment**: Merge to main triggers deployment

---

This comprehensive documentation provides everything needed to understand, replicate, and extend the Synthara AI platform. The system represents a sophisticated blend of modern web technologies, AI services, and robust engineering practices designed for scalable synthetic data generation.
