# AI-Powered Web Scraping Dataset Generator

An intelligent data generation platform that combines web scraping with AI-driven content analysis to create comprehensive, real-world datasets for machine learning and research applications.

## 🎯 Core Goals

### Primary Objectives
- **Real Data Extraction**: Generate datasets from live web content rather than synthetic data
- **Content-First Approach**: Let scraped content dictate optimal dataset schema instead of forcing predetermined structures
- **Maximum Data Utilization**: Extract comprehensive information from all available web sources
- **Dynamic Schema Discovery**: AI analyzes content to determine the most valuable column structure
- **Quality Over Quantity**: Prioritize meaningful, accurate data extraction over volume

### Key Capabilities
- **Live Web Data Generation**: Real-time scraping and processing of current web content
- **AI-Driven Schema Optimization**: Dynamic column creation based on content analysis
- **Multi-Source Integration**: Combine data from multiple web sources for comprehensive datasets
- **Medical/Scientific Data Specialization**: Advanced extraction for research and clinical applications
- **Scalable Processing**: Handle large content volumes (350KB+ per request) efficiently

## 🔬 Core Technique

### Content-First Dynamic Schema Discovery

Our revolutionary approach prioritizes content analysis over predetermined schemas:

#### Traditional Approach (Limited)
```
User Request → Predefined Schema → Force Data to Fit → Limited Results
```

#### Our Approach (Comprehensive)
```
User Request → Web Scraping → Content Analysis → Dynamic Schema → Comprehensive Extraction
```

### AI-Powered Data Extraction
- **Phase 1**: Comprehensive content analysis to identify all available data types
- **Phase 2**: Dynamic schema creation based on content richness
- **Phase 3**: Intelligent data extraction using discovered patterns and relationships
- **Phase 4**: Real-value generation from medical ranges, research data, and statistical information

### Multi-AI Model Strategy
- **Primary**: Anthropic Claude (Claude-3.5-Sonnet) for large content processing and superior reasoning
- **Fallback**: Google Gemini models for reliability and consistency
- **Intelligent Routing**: Automatic model selection based on content size and complexity

## 🔄 Workflow Architecture

### 1. Search Query Optimization
```
User Prompt → AI Query Refinement → Optimized Search Terms → SerpAPI
```
- **AI Enhancement**: Transform user requests into effective search queries
- **Keyword Extraction**: Identify specific terms and needed information
- **Search Optimization**: Improve result relevance for dataset generation

### 2. Intelligent Web Scraping
```
Search Results → URL Filtering → Parallel Scraping → Content Validation
```
- **Quality Filtering**: Select high-value sources (research papers, medical sites, official sources)
- **Parallel Processing**: Concurrent scraping with timeout management
- **Content Validation**: Ensure minimum quality and relevance thresholds

### 3. Content-First Analysis
```
Raw Content → Structure Analysis → Pattern Recognition → Schema Discovery
```
- **Comprehensive Scanning**: Analyze tables, lists, paragraphs, research sections
- **Pattern Detection**: Identify data relationships and correlations
- **Schema Optimization**: Design columns that maximize content value

### 4. Dynamic Data Extraction
```
Schema Design → Real Data Extraction → Value Generation → Dataset Creation
```
- **Real Value Extraction**: Extract actual measurements, statistics, and research data
- **Range-Based Generation**: Use medical/scientific ranges for realistic data points
- **Relationship Mapping**: Correlate related parameters intelligently

### 5. Quality Assurance
```
Data Validation → Schema Consistency → Output Formatting → CSV Generation
```
- **Schema Matching**: Ensure JSON keys exactly match schema definitions
- **Data Type Validation**: Verify numerical values and categorical data
- **Format Standardization**: Consistent output structure for downstream use

## 🧠 AI Integration Strategy

### Prompt Engineering Excellence
- **Explicit Instructions**: Clear, specific commands for data extraction
- **Medical Knowledge Integration**: Leverage domain expertise for accurate data generation
- **Example-Driven Learning**: Provide concrete examples of expected output
- **Error Prevention**: Built-in safeguards against common AI mistakes

### Content Processing Optimization
- **No Truncation Limits**: Process full content regardless of size
- **Intelligent Chunking**: Handle large documents efficiently
- **Context Preservation**: Maintain data relationships across content sections
- **Real-Time Processing**: Stream results for immediate feedback

### Fallback Mechanisms
- **Multi-Model Redundancy**: Automatic failover between AI services
- **Graceful Degradation**: Maintain functionality even with partial failures
- **Error Recovery**: Intelligent retry logic with exponential backoff
- **Quality Monitoring**: Continuous validation of AI output quality

## 🎯 Specialized Applications

### Medical & Scientific Research
- **Clinical Data Extraction**: AFI measurements, gestational ages, fetal weights
- **Research Paper Mining**: Statistical data, study results, clinical findings
- **Range-Based Generation**: Normal values, pathological ranges, reference standards
- **Multi-Parameter Correlation**: Realistic combinations of medical measurements

### Financial & Market Data
- **Real-Time Extraction**: Stock prices, market movements, financial ratios
- **Historical Analysis**: Trend data, comparative metrics, performance indicators
- **Multi-Source Aggregation**: Combine data from various financial sources
- **Sentiment Integration**: Market sentiment from news and analysis

### General Purpose Datasets
- **Flexible Schema Adaptation**: Adjust to any domain or data type
- **Cross-Domain Intelligence**: Apply techniques across different industries
- **Scalable Processing**: Handle varying content sizes and complexities
- **Quality Consistency**: Maintain high standards regardless of domain

## 🚀 Innovation Highlights

### Revolutionary Features
- **Content-Driven Schema**: First system to let content determine optimal dataset structure
- **AI Query Refinement**: Intelligent search optimization for better source discovery
- **Real Data Priority**: Focus on actual data extraction over synthetic generation
- **Dynamic Column Creation**: Adaptive schema based on available content richness
- **Medical AI Integration**: Specialized knowledge for healthcare and research applications

### Technical Excellence
- **Zero Data Truncation**: Process unlimited content sizes
- **Intelligent Caching**: Prevent duplicate requests while allowing fresh processing
- **Real-Time Feedback**: Live progress updates and transparent processing
- **Error Resilience**: Robust handling of API failures and content issues
- **Performance Optimization**: Efficient processing of large-scale web content

This platform represents a paradigm shift from traditional data generation to intelligent, content-driven dataset creation that maximizes the value of real-world web information.

## 🚀 Quick Start & Deployment

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/SumanthPrasadTM/Synthara.git
   cd Synthara
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

### 🌐 Deploy to Netlify

#### Option 1: One-Click Deploy
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/SumanthPrasadTM/Synthara)

#### Option 2: Manual Deployment

1. **Prepare for deployment**
   ```bash
   npm run deploy:prepare
   ```

2. **Connect to Netlify**
   - Push your code to GitHub
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "New site from Git"
   - Connect your GitHub repository

3. **Configure build settings**
   - Build command: `npm run build:netlify`
   - Publish directory: `.next`
   - Node version: `18`

4. **Set environment variables** in Netlify dashboard:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ANTHROPIC_API_KEY=your_anthropic_key
   GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key
   SERPAPI_API_KEY=your_serpapi_key
   FIRECRAWL_API_KEY=your_firecrawl_key
   PREFERRED_AI_MODEL=anthropic/claude-3-5-sonnet-20241022
   ```

5. **Deploy**
   - Click "Deploy site"
   - Your app will be live at `https://your-site-name.netlify.app`

### 📋 Required API Keys

| Service | Purpose | Get API Key |
|---------|---------|-------------|
| **Supabase** | Database & Authentication | [supabase.com](https://supabase.com) |
| **Anthropic** | Primary AI Model (Claude) | [console.anthropic.com](https://console.anthropic.com) |
| **Google AI** | Fallback AI Model (Gemini) | [aistudio.google.com](https://aistudio.google.com) |
| **SerpAPI** | Web Search Results | [serpapi.com](https://serpapi.com) |
| **Firecrawl** | Web Content Scraping | [firecrawl.dev](https://firecrawl.dev) |

### 🔧 Build Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Type checking
npm run typecheck

# Clean build artifacts
npm run clean

# Optimize for deployment
npm run optimize
```

### 🌟 Features Ready for Production

- ✅ **Anthropic Claude Integration** - Primary AI model for superior reasoning
- ✅ **Dynamic Content System** - Context-aware UI and intelligent examples
- ✅ **Real Data Extraction** - No more placeholder or "undefined" values
- ✅ **Web Scraping Pipeline** - Live data from research papers and websites
- ✅ **Multi-Domain Support** - Medical, financial, IoT, social media, and more
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile
- ✅ **Authentication** - Secure user management with Supabase
- ✅ **Data Management** - Save, preview, and analyze generated datasets

### 📊 Performance Optimizations

- **Bundle Splitting** - Optimized chunk loading
- **Image Optimization** - Automatic image compression and formats
- **CSS Optimization** - Minimized and optimized stylesheets
- **Tree Shaking** - Unused code elimination
- **Lazy Loading** - Components loaded on demand

### 🔒 Security Features

- **Environment Variables** - Secure API key management
- **CORS Protection** - Cross-origin request security
- **Input Validation** - Comprehensive data validation
- **Authentication** - Secure user sessions
- **Rate Limiting** - API abuse prevention

### 📈 Monitoring & Analytics

The application includes built-in monitoring for:
- API usage and performance
- User activity tracking
- Error logging and reporting
- Dataset generation metrics

### 🆘 Support & Documentation

- **Help Center**: Available at `/help` route
- **API Documentation**: Comprehensive API guides
- **Community Support**: GitHub Issues and Discussions
- **Professional Support**: Contact through the application

---

**Ready to deploy your AI-powered dataset generator? Click the deploy button above or follow the manual deployment guide!** 🚀
