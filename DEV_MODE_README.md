# Synthara AI - Developer Mode Documentation

## Project Overview

Synthara is an advanced AI-powered web data generation platform that combines real-time web scraping with intelligent data structuring. The platform transforms natural language prompts into structured datasets using a sophisticated pipeline of AI processing, web search, content extraction, and data structuring.

## Core Architecture & Technology Stack

### Frontend Technologies
- **Next.js 15.3.3**: Full-stack React framework with App Router for SSR/SSG capabilities
- **TypeScript**: Type-safe development with strict type checking
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **shadcn/ui**: Modern component library built on Radix UI primitives
- **Radix UI**: Headless UI components for accessibility and functionality
- **React Hook Form + Zod**: Form state management with runtime validation
- **Lucide React**: Comprehensive icon library
- **Material-UI (@mui)**: Additional component library for complex data visualization
- **Recharts**: Advanced charting and data visualization

### Backend & API Infrastructure
- **Next.js API Routes**: Serverless backend with TypeScript
- **Server-Sent Events (SSE)**: Real-time streaming updates for long-running processes
- **Zod Schema Validation**: Runtime type checking and validation throughout API layer

### AI & Machine Learning Integration
- **Google Gemini 2.0 Flash**: Primary AI service for content analysis, query refinement, and data structuring
- **SerpAPI**: Web search service for finding relevant data sources
- **OpenAI**: Optional AI service integration for fallback capabilities

### Data Processing & Storage
- **Supabase**: PostgreSQL database with Row Level Security (RLS), authentication, and file storage
- **Crawl4AI**: Python microservice for advanced web scraping with JavaScript rendering
- **CSV/JSON Processing**: Data export and import capabilities
- **docx Export**: Document generation with jsPDF and docx libraries

## Core Business Logic & Workflow

### 1. Data Generation Pipeline

#### Phase 1: Query Enhancement & URL Discovery
- **Input**: Natural language user query (e.g., "restaurant data in Mumbai with ratings")
- **AI Processing**: Google Gemini analyzes the query and generates multiple search-optimized keywords
- **Web Search**: SerpAPI executes searches to find relevant web sources
- **URL Selection**: System selects high-quality URLs based on domain authority and relevance

#### Phase 2: Content Extraction & Processing
- **Web Scraping**: Crawl4AI service scrapes selected URLs with advanced options:
  - JavaScript rendering support
  - Markdown extraction for clean content
  - Table extraction for structured data
  - Content cleaning and noise removal
- **Content Filtering**: AI refines scraped content to remove navigation, ads, and irrelevant information
- **Data Aggregation**: Multiple sources combined into comprehensive markdown dataset

#### Phase 3: AI-Powered Data Structuring
- **Schema Design**: Gemini analyzes scraped content and designs appropriate data schema
- **Data Extraction**: AI extracts relevant information and structures it into tabular format
- **Data Generation**: Creates specified number of rows with realistic, consistent data
- **Quality Validation**: Automated checks for data consistency and completeness

#### Phase 4: Output Generation & Storage
- **CSV Generation**: Automatic CSV file creation with proper escaping and formatting
- **Database Storage**: Saves generated datasets to Supabase with metadata
- **User Interface**: Real-time preview with interactive data tables and charts

### 2. Real-time Processing Architecture

#### Server-Sent Events (SSE) Implementation
- **Connection Management**: Persistent connections for real-time updates
- **Progress Tracking**: Multi-step progress indicators with detailed status messages
- **Error Handling**: Graceful degradation and retry mechanisms
- **Broadcast System**: Multiple client support for collaborative sessions

#### Request Deduplication
- **Duplicate Prevention**: Automatic detection and prevention of identical concurrent requests
- **Resource Optimization**: Efficient handling of multiple simultaneous users
- **Cache Management**: Smart caching of frequently accessed data

## Component Architecture Analysis

### 1. Authentication & User Management

#### Supabase Integration (`src/lib/supabase/`)
- **Client Configuration**: Browser-based Supabase client with environment validation
- **Server Configuration**: Server-side client for API routes with admin privileges
- **Authentication Flow**: Email/password with optional OAuth providers (Google, GitHub)
- **Row Level Security**: Database-level access control for data privacy

#### User Components (`src/components/auth/`)
- **AuthForm**: Unified login/signup form with validation
- **Session Management**: Automatic session handling and refresh
- **Protected Routes**: Middleware-based route protection

### 2. Data Generation Engine

#### Core Flow (`src/ai/flows/intelligent-web-scraping-flow.ts`)
- **Orchestration**: Main coordinator for the entire data generation process
- **Error Handling**: Comprehensive error recovery and fallback mechanisms
- **Logging System**: Detailed progress tracking with real-time updates
- **File Management**: Temporary file creation and cleanup

#### AI Flows (`src/ai/flows/`)
- **Enhance Prompt Flow**: Query optimization and keyword generation
- **Generate Search URLs Flow**: URL discovery and quality assessment
- **Refine Scraped Content Flow**: Content cleaning and relevance filtering
- **Structure Data Flow**: Schema design and data extraction

### 3. Service Layer Architecture

#### Gemini Service (`src/services/gemini-service.ts`)
- **API Integration**: Robust Gemini API client with retry logic
- **Query Processing**: Natural language to search query conversion
- **Content Analysis**: Scraped content refinement and structuring
- **JSON Parsing**: Advanced parsing strategies for AI responses
- **Rate Limiting**: Built-in rate limiting and exponential backoff

#### SerpAPI Service (`src/services/serpapi-service.ts`)
- **Search Execution**: Web search with multiple query support
- **Result Processing**: Organic result extraction and deduplication
- **Domain Analysis**: Source quality assessment and filtering
- **Error Handling**: Comprehensive error recovery mechanisms

#### Crawl4AI Integration (`src/app/api/crawl4ai/route.ts`)
- **Service Communication**: Bridge to Python scraping microservice
- **Request Management**: Batch processing with retry logic
- **Content Extraction**: Multiple content format support (Markdown, HTML, text)
- **Health Monitoring**: Service availability checking

### 4. Data Visualization & Analysis

#### Chart Components (`src/components/charts/`)
- **Multi-type Support**: Line, Bar, Pie, Scatter, Histogram, Heatmap, Treemap
- **Responsive Design**: Mobile-optimized chart rendering
- **Interactive Features**: Tooltips, zoom, and data point selection
- **Dynamic Theming**: Light/dark mode support with color adaptation

#### Analysis Service (`src/services/analysis-service.ts`)
- **Data Profiling**: Automatic data type detection and statistics
- **Quality Assessment**: Data completeness and consistency analysis
- **Visualization Logic**: Intelligent chart type selection
- **Export Capabilities**: Multiple format support for analysis results

### 5. User Interface Components

#### Layout System (`src/components/layout/`)
- **DashboardHeader**: Navigation bar with user menu and actions
- **SidebarNav**: Collapsible navigation with active state management
- **Footer**: Application footer with links and information
- **Responsive Design**: Mobile-first responsive layout system

#### Dashboard Components (`src/components/dashboard/`)
- **StatsCard**: Metric display with trend indicators
- **ActivityFeed**: Real-time activity logging and history
- **QuickActions**: Fast access to common operations
- **CsvPreviewTable**: Interactive data table with sorting and filtering

## Routing Architecture & Page Analysis

### 1. Application Structure

#### Public Routes
- **`/`**: Landing page with product overview and features
- **`/help`**: Documentation and support resources
- **`/(auth)`**: Authentication routes (login, signup, callback)

#### Protected Dashboard Routes
- **`/dashboard`**: Main dashboard with overview and quick actions
- **`/dashboard/generate`**: Primary data generation interface
- **`/dashboard/analysis`**: Data analysis and visualization tools
- **`/dashboard/history`**: User's dataset history and management
- **`/dashboard/profile`**: User profile and settings
- **`/dashboard/preview`**: Data preview and export options
- **`/dashboard/settings`**: Application configuration and preferences

### 2. Page Functionality Analysis

#### Generate Page (`/dashboard/generate`)
- **DataGenerationClient**: Main React component managing the generation workflow
- **Form Integration**: Multi-step form with validation and progress tracking
- **Real-time Updates**: SSE integration for live progress updates
- **Error Handling**: Comprehensive error display and recovery options
- **Export Options**: Multiple download formats and sharing capabilities

#### Analysis Page (`/dashboard/analysis`)
- **Data Upload**: File upload with validation and preprocessing
- **Chart Generation**: Automatic chart type selection and rendering
- **Interactive Visualization**: Dynamic chart updates based on data selection
- **Export Options**: Chart and analysis export in multiple formats

#### History Page (`/dashboard/history`)
- **Dataset Listing**: Paginated list of user's generated datasets
- **Search & Filter**: Advanced filtering by date, type, and content
- **Actions Preview**: Quick preview and management actions
- **Bulk Operations**: Multiple dataset selection and batch operations

### 3. API Routes Architecture

#### Data Generation APIs
- **`/api/generate-stream`**: Main SSE endpoint for real-time generation
- **`/api/generate-stream-sse`**: Alternative SSE implementation
- **`/api/enhance-prompt`**: Query optimization and enhancement
- **`/api/refine-search-query`**: Search query improvement

#### Data Management APIs
- **`/api/datasets`**: Dataset CRUD operations
- **`/api/datasets/[id]`**: Individual dataset operations
- **`/api/save-dataset`**: Dataset saving with metadata
- **`/api/analyze-dataset`**: Data analysis and profiling

#### Export APIs
- **`/api/export-docx`**: Document generation and export
- **File Storage**: Direct file download with proper headers

#### System APIs
- **`/api/health`**: System health monitoring
- **`/api/crawl4ai`**: Web scraping service integration
- **`/api/validate-content-quality`**: Content quality assessment

## Database Architecture & Data Models

### 1. Supabase Schema Design

#### Core Tables
- **`user_profiles`**: User information and preferences
- **`generated_datasets`**: Dataset storage with metadata and CSV data
- **`user_activities`**: Activity logging and audit trail
- **`file_storage`**: File tracking and management

#### Security Implementation
- **Row Level Security (RLS)**: Database-level access control
- **JWT Authentication**: Token-based user authentication
- **Policies**: Granular access control for different user roles
- **Indexing**: Optimized queries for performance

### 2. Data Flow Architecture

#### Generation Pipeline
1. **Input Validation**: Zod schema validation for all inputs
2. **Query Processing**: AI-powered query enhancement
3. **URL Discovery**: Multiple search strategies with fallback
4. **Content Extraction**: Parallel scraping with error recovery
5. **AI Analysis**: Content refinement and structuring
6. **Data Generation**: Schema-based data creation
7. **Output Formatting**: CSV generation with proper escaping
8. **Storage**: Database storage with full-text search capabilities

#### Real-time Updates
- **SSE Implementation**: Server-Sent Events for live updates
- **Connection Management**: Persistent connection handling
- **Broadcast System**: Multi-client support
- **Error Recovery**: Automatic reconnection and state synchronization

## Development Tools & Implementation Details

### 1. Build System & Optimization

#### Next.js Configuration
- **App Router**: Modern routing with automatic code splitting
- **Static Generation**: Optimized for SEO and performance
- **Image Optimization**: Automatic image optimization and WebP/AVIF support
- **Bundle Analysis**: Built-in bundle analyzer for optimization

#### TypeScript Configuration
- **Strict Mode**: Full TypeScript strict mode enabled
- **Path Mapping**: Clean import paths with alias configuration
- **Type Checking**: Comprehensive type coverage across codebase
- **ESLint Integration**: Automated code quality checks

### 2. UI/UX Implementation

#### Design System
- **Theme Provider**: Dark/light mode support with system detection
- **Component Library**: Consistent design language with shadcn/ui
- **Responsive Design**: Mobile-first responsive breakpoints
- **Accessibility**: WCAG compliance with semantic HTML and ARIA labels

#### User Experience
- **Progressive Loading**: Skeleton screens and progressive enhancement
- **Error Boundaries**: Graceful error handling and recovery
- **Performance Monitoring**: Real-time performance tracking
- **Feedback Systems**: Toast notifications and loading states

### 3. State Management Architecture

#### Client-Side State
- **React State**: Local component state with useState/useReducer
- **Custom Hooks**: Reusable state logic with custom hooks
- **Form State**: React Hook Form for complex form management
- **Server State**: Real-time synchronization with SSE

#### Server-Side State
- **Session Management**: Supabase authentication state
- **Database State**: PostgreSQL with RLS policies
- **Cache Strategy**: Intelligent caching for performance
- **Error State**: Comprehensive error handling and logging

## Deployment & Production Considerations

### 1. Environment Configuration

#### Required Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Services
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
SERPAPI_KEY=your_serpapi_key

# Optional Services
OPENAI_API_KEY=your_openai_api_key
CRAWL4AI_SERVICE_URL=http://localhost:8000

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

#### Service Dependencies
- **Crawl4AI Service**: Python microservice for web scraping
- **Supabase Database**: PostgreSQL instance with RLS enabled
- **AI Services**: External API integrations with rate limiting

### 2. Production Deployment

#### Vercel Configuration
- **Automatic Deployment**: Git-based deployment with preview environments
- **Environment Variables**: Secure environment variable management
- **Edge Functions**: Serverless functions for API routes
- **Performance Monitoring**: Built-in analytics and monitoring

#### Database Setup
- **Schema Migration**: Automated database schema setup
- **Security Policies**: Row Level Security configuration
- **Backup Strategy**: Automated backup and point-in-time recovery
- **Performance Optimization**: Query optimization and indexing

### 3. Monitoring & Observability

#### Health Checks
- **API Health**: Endpoint monitoring and status checking
- **Service Health**: External service availability monitoring
- **Database Health**: Connection and performance monitoring
- **System Health**: Resource usage and performance metrics

#### Error Handling
- **Comprehensive Logging**: Structured logging throughout application
- **Error Boundaries**: Client-side error recovery
- **API Error Handling**: Consistent error response format
- **User Feedback**: User-friendly error messages and recovery options

## Security Implementation

### 1. Authentication & Authorization
- **Supabase Auth**: Industry-standard authentication
- **JWT Tokens**: Secure token-based authentication
- **Session Management**: Automatic session refresh and expiration
- **Multi-factor Support**: Optional 2FA implementation

### 2. Data Protection
- **Row Level Security**: Database-level access control
- **Input Validation**: Comprehensive input sanitization and validation
- **API Security**: Rate limiting and request validation
- **Environment Security**: Secure API key management

### 3. Privacy & Compliance
- **Data Minimization**: Only collect necessary data
- **User Control**: Full data access and deletion capabilities
- **Audit Trail**: Complete activity logging and tracking
- **GDPR Compliance**: Privacy by design implementation

## Performance Optimization Strategies

### 1. Frontend Optimization
- **Code Splitting**: Automatic route-based code splitting
- **Lazy Loading**: Component and image lazy loading
- **Bundle Optimization**: Tree shaking and dependency optimization
- **Caching Strategy**: Intelligent browser and CDN caching

### 2. Backend Optimization
- **API Optimization**: Efficient data fetching and response formatting
- **Database Optimization**: Query optimization and connection pooling
- **Caching Layer**: Redis integration for frequently accessed data
- **Rate Limiting**: Intelligent rate limiting for API protection

### 3. Scalability Considerations
- **Horizontal Scaling**: Auto-scaling configuration
- **Database Scaling**: Read replicas and connection management
- **Service Scaling**: Microservice scaling strategies
- **Load Balancing**: Intelligent load distribution

## Conclusion

Synthara represents a sophisticated implementation of modern web development practices, combining advanced AI capabilities with robust engineering principles. The architecture supports scalable growth while maintaining excellent user experience and developer productivity.

The platform's modular design allows for easy extension and modification, while the comprehensive testing and monitoring ensure reliability in production environments. The use of modern TypeScript patterns and React best practices creates a maintainable and scalable codebase that can adapt to evolving requirements.

---

**Last Updated**: October 2025
**Version**: 1.0.0
**Framework**: Next.js 15.3.3 with TypeScript
