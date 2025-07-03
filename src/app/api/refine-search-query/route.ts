import { NextRequest, NextResponse } from 'next/server';
import { OpenRouterService } from '@/services/openrouter-service';

export async function POST(request: NextRequest) {
  try {
    const { userPrompt } = await request.json();

    if (!userPrompt || typeof userPrompt !== 'string') {
      return NextResponse.json(
        { error: 'User prompt is required' },
        { status: 400 }
      );
    }

    // Create OpenRouter service
    const openRouterService = createOpenRouterService();
    if (!openRouterService) {
      // Fallback to simple keyword extraction
      const fallbackResult = extractSimpleKeywords(userPrompt);
      return NextResponse.json({
        searchQuery: fallbackResult.searchQuery,
        reasoning: 'Used fallback keyword extraction (OpenRouter not available)',
        targetType: fallbackResult.targetType,
        qualityScore: fallbackResult.qualityScore,
        isFallback: true
      });
    }

    try {
      const refinementPrompt = `You are an expert search query optimizer. Your task is to convert user requests into highly effective Google search queries that will find pages with actual, structured data rather than generic information pages.

CRITICAL RULES:
1. PRESERVE location details (cities, countries, regions) - these are essential for relevant results
2. PRESERVE time qualifiers (latest, recent, current, 2024, etc.)
3. PRESERVE specific domains/industries mentioned
4. REMOVE instruction words: "generate", "create", "provide", "I need", "give me", "find", "get", "make", "build", "retrieve"
5. REMOVE data collection words: "data", "dataset", "table", "list", "information", "details"
6. ADD site-specific targeting when appropriate (e.g., "site:naukri.com" for jobs, "site:gov.in" for government schemes)
7. TARGET pages with actual listings/data rather than homepages

SEARCH STRATEGY:
- For jobs: Target job listing pages, not job portal homepages
- For government schemes: Target official government pages with scheme lists
- For financial data: Target pages with actual numbers, not general finance sites
- For products: Target pages with actual product listings and prices

EXAMPLES:
"Retrieve latest job postings in Bangalore, India for AI/ML roles" → "AI ML jobs Bangalore India site:naukri.com OR site:linkedin.com/jobs OR site:indeed.co.in"
"Generate government schemes data with budget details" → "government schemes India budget allocation site:gov.in OR site:pib.gov.in"
"Create stock market data for Indian companies" → "Indian stock prices NSE BSE live data site:nseindia.com OR site:bseindia.com"
"Get latest iPhone models with prices in India" → "iPhone 15 14 13 price India flipkart amazon specifications"

User request: "${userPrompt}"

Respond with ONLY a JSON object containing:
{
  "searchQuery": "optimized search query (3-12 words)",
  "reasoning": "brief explanation of optimization strategy",
  "targetType": "job_listings|government_data|financial_data|product_listings|general",
  "qualityScore": 8
}`;

      // Use direct OpenRouter API call for search query refinement
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_SITE_URL || '',
          'X-Title': process.env.OPENROUTER_SITE_NAME || 'Synthara AI'
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [{ role: 'user', content: refinementPrompt }],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      // Clean and parse the response
      let cleanedContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

      // Try to extract JSON if it's wrapped in other text
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedContent = jsonMatch[0];
      }

      let parsed;
      try {
        parsed = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('[Query Refinement API] Failed to parse response:', cleanedContent);
        throw new Error('Invalid JSON response from OpenRouter');
      }

      // Extract values from parsed response
      const searchQuery = parsed.searchQuery;
      const reasoning = parsed.reasoning;
      const targetType = parsed.targetType;
      const qualityScore = parsed.qualityScore;

      if (!searchQuery || typeof searchQuery !== 'string') {
        throw new Error('No valid search query returned');
      }

      return NextResponse.json({
        searchQuery: searchQuery.trim(),
        reasoning: reasoning || 'Query refined using OpenRouter DeepSeek',
        targetType: targetType || 'general',
        qualityScore: qualityScore || 7,
        isFallback: false
      });

    } catch (aiError: any) {
      console.error('[Query Refinement API] OpenRouter failed:', aiError.message);

      // Fallback to simple keyword extraction
      const fallbackResult = extractSimpleKeywords(userPrompt);
      return NextResponse.json({
        searchQuery: fallbackResult.searchQuery,
        reasoning: `Used fallback keyword extraction due to AI service error: ${aiError.message}`,
        targetType: fallbackResult.targetType,
        qualityScore: fallbackResult.qualityScore,
        isFallback: true
      });
    }

  } catch (error: any) {
    console.error('[Query Refinement API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to refine search query' },
      { status: 500 }
    );
  }
}

// Helper function to create OpenRouter service
function createOpenRouterService(): OpenRouterService | null {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const baseUrl = process.env.OPENROUTER_BASE_URL;
    const model = process.env.OPENROUTER_MODEL;
    const siteUrl = process.env.OPENROUTER_SITE_URL;
    const siteName = process.env.OPENROUTER_SITE_NAME;

    if (!apiKey) {
      console.warn('[OpenRouter API] API key not found in environment variables');
      return null;
    }

    return new OpenRouterService({
      apiKey,
      baseUrl,
      model,
      siteUrl,
      siteName
    });
  } catch (error: any) {
    console.error('[OpenRouter API] Failed to create service:', error);
    return null;
  }
}

// Simple keyword extraction fallback
function extractSimpleKeywords(userPrompt: string): { searchQuery: string; reasoning: string; targetType: string; qualityScore: number } {
  const instructionWords = [
    'generate', 'create', 'provide', 'give me', 'i need', 'find', 'get', 'make', 'build', 'retrieve',
    'data', 'dataset', 'table', 'list', 'information', 'details', 'for', 'with', 'of', 'the',
    'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'from', 'by', 'as', 'is', 'are'
  ];

  const importantWords = [
    'bangalore', 'mumbai', 'delhi', 'chennai', 'hyderabad', 'pune', 'kolkata', 'india',
    'latest', 'recent', 'current', 'new', 'jobs', 'job', 'posting', 'postings',
    'salary', 'price', 'cost', 'stock', 'market', 'nse', 'bse', 'company', 'companies'
  ];

  const words = userPrompt.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !instructionWords.includes(word));

  const priorityWords = words.filter(word => importantWords.includes(word));
  const otherWords = words.filter(word => !importantWords.includes(word));

  const finalWords = [...priorityWords, ...otherWords].slice(0, 6);

  // Detect target type based on keywords
  let targetType = "general";
  let qualityScore = 5; // Default medium confidence

  if (words.some(k => ['job', 'jobs', 'employment', 'career', 'hiring', 'posting', 'postings'].includes(k))) {
    targetType = "job_listings";
    qualityScore = 6; // Higher confidence for job searches
  } else if (words.some(k => ['government', 'scheme', 'policy', 'ministry', 'gov', 'official'].includes(k))) {
    targetType = "government_data";
    qualityScore = 7; // Government data is usually well-structured
  } else if (words.some(k => ['stock', 'price', 'market', 'financial', 'nse', 'bse', 'trading'].includes(k))) {
    targetType = "financial_data";
    qualityScore = 6;
  } else if (words.some(k => ['product', 'price', 'buy', 'sell', 'model', 'specification'].includes(k))) {
    targetType = "product_listings";
    qualityScore = 6;
  }

  // Add site-specific targeting for better results
  let searchQuery = finalWords.join(' ');
  if (targetType === "job_listings" && words.some(k => ['bangalore', 'mumbai', 'delhi', 'india'].includes(k))) {
    searchQuery += " site:naukri.com OR site:linkedin.com/jobs";
    qualityScore += 1;
  } else if (targetType === "government_data") {
    searchQuery += " site:gov.in OR site:pib.gov.in";
    qualityScore += 1;
  }

  return {
    searchQuery,
    reasoning: `Simple keyword extraction used. Removed instruction words and kept relevant terms. Added site targeting for ${targetType}.`,
    targetType,
    qualityScore: Math.min(qualityScore, 8) // Cap at 8 for fallback method
  };
}
