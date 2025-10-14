import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userPrompt } = body;

    console.log(`[RefineAPI] 🔍 Request body:`, { userPrompt: userPrompt?.substring(0, 50) });

    if (!userPrompt || typeof userPrompt !== 'string') {
      return NextResponse.json(
        { error: 'User prompt is required' },
        { status: 400 }
      );
    }

    // Simple keyword extraction fallback
    const fallbackResult = extractSimpleKeywords(userPrompt);
    
    console.log(`[RefineAPI] ✅ Using simple keyword extraction:`, fallbackResult);

    return NextResponse.json({
      success: true,
      originalPrompt: userPrompt,
      refinedQueries: [fallbackResult.searchQuery],
      reasoning: "Simple keyword extraction used",
      searchQuery: fallbackResult.searchQuery,
      targetType: 'general',
      qualityScore: 6,
      isFallback: true,
      isNewRefiner: false
    });

  } catch (error: any) {
    console.error('[RefineAPI] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function extractSimpleKeywords(userPrompt: string): { searchQuery: string; keywords: string[] } {
  // Simple keyword extraction
  const words = userPrompt
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2)
    .filter(word => !isStopWord(word));

  // Remove duplicates and limit to 5 keywords
  const uniqueWords = [...new Set(words)].slice(0, 5);
  
  return {
    searchQuery: uniqueWords.join(' '),
    keywords: uniqueWords
  };
}

function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
  ]);
  return stopWords.has(word);
}