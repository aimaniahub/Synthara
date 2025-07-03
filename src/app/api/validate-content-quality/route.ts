import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { scrapedContent, userPrompt, searchQuery } = await request.json();

    if (!scrapedContent || !userPrompt) {
      return NextResponse.json(
        { error: 'Scraped content and user prompt are required' },
        { status: 400 }
      );
    }

    const validation = validateContentQuality(scrapedContent, userPrompt, searchQuery);
    
    return NextResponse.json(validation);

  } catch (error: any) {
    console.error('[Content Quality API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to validate content quality' },
      { status: 500 }
    );
  }
}

interface ContentQualityResult {
  qualityScore: number; // 1-10 scale
  hasRealData: boolean;
  dataType: 'structured' | 'semi_structured' | 'unstructured' | 'minimal';
  contentSummary: string;
  extractionRecommendation: 'extract' | 'generate' | 'hybrid';
  issues: string[];
  strengths: string[];
  sourceCount: number;
  totalLength: number;
}

function validateContentQuality(
  scrapedContent: string, 
  userPrompt: string, 
  searchQuery?: string
): ContentQualityResult {
  const issues: string[] = [];
  const strengths: string[] = [];
  let qualityScore = 5; // Start with neutral score
  
  // Basic content analysis
  const contentLength = scrapedContent.length;
  const sourceCount = (scrapedContent.match(/## Source \d+:/g) || []).length;
  
  // Check for minimal content
  if (contentLength < 1000) {
    issues.push("Very limited content scraped");
    qualityScore -= 2;
  } else if (contentLength > 50000) {
    strengths.push("Rich content available for analysis");
    qualityScore += 1;
  }

  // Check for structured data indicators
  const hasTableStructure = /\|.*\|.*\|/.test(scrapedContent) || 
                           scrapedContent.includes('| --- |') ||
                           scrapedContent.includes('**Detected Structure:** Tables');
  
  const hasListStructure = /^\s*[-*]\s+/m.test(scrapedContent) ||
                          /^\s*\d+\.\s+/m.test(scrapedContent);
  
  const hasDataValues = /\d+[,.]?\d*/.test(scrapedContent) &&
                       (scrapedContent.includes('₹') || 
                        scrapedContent.includes('$') ||
                        scrapedContent.includes('%') ||
                        /\d{4}/.test(scrapedContent)); // Years or large numbers

  // Determine data type and adjust score
  let dataType: 'structured' | 'semi_structured' | 'unstructured' | 'minimal' = 'minimal';
  
  if (hasTableStructure && hasDataValues) {
    dataType = 'structured';
    strengths.push("Contains structured tables with data");
    qualityScore += 3;
  } else if (hasListStructure || hasDataValues) {
    dataType = 'semi_structured';
    strengths.push("Contains organized lists or data points");
    qualityScore += 2;
  } else if (contentLength > 5000) {
    dataType = 'unstructured';
    strengths.push("Substantial text content available");
    qualityScore += 1;
  } else {
    dataType = 'minimal';
    issues.push("Limited structured data found");
    qualityScore -= 1;
  }

  // Check for specific content types based on user prompt
  const promptLower = userPrompt.toLowerCase();
  
  if (promptLower.includes('job') || promptLower.includes('employment')) {
    const hasJobIndicators = scrapedContent.toLowerCase().includes('salary') ||
                            scrapedContent.toLowerCase().includes('experience') ||
                            scrapedContent.toLowerCase().includes('skills') ||
                            scrapedContent.toLowerCase().includes('company');
    
    if (hasJobIndicators) {
      strengths.push("Contains job-related information");
      qualityScore += 1;
    } else {
      issues.push("Limited job-specific data found");
      qualityScore -= 1;
    }
  }

  if (promptLower.includes('government') || promptLower.includes('scheme')) {
    const hasGovIndicators = scrapedContent.toLowerCase().includes('ministry') ||
                            scrapedContent.toLowerCase().includes('budget') ||
                            scrapedContent.toLowerCase().includes('scheme') ||
                            scrapedContent.toLowerCase().includes('policy');
    
    if (hasGovIndicators) {
      strengths.push("Contains government scheme information");
      qualityScore += 1;
    } else {
      issues.push("Limited government scheme data found");
      qualityScore -= 1;
    }
  }

  // Check for common scraping issues
  if (scrapedContent.includes('login') || scrapedContent.includes('sign in')) {
    issues.push("Content may require authentication");
    qualityScore -= 2;
  }

  if (scrapedContent.includes('404') || scrapedContent.includes('not found')) {
    issues.push("Some sources returned errors");
    qualityScore -= 1;
  }

  if (scrapedContent.includes('robot') || scrapedContent.includes('captcha')) {
    issues.push("Anti-bot measures detected");
    qualityScore -= 2;
  }

  // Check source diversity
  if (sourceCount >= 3) {
    strengths.push(`Multiple sources (${sourceCount}) provide diverse data`);
    qualityScore += 1;
  } else if (sourceCount <= 1) {
    issues.push("Limited source diversity");
    qualityScore -= 1;
  }

  // Normalize score to 1-10 range
  qualityScore = Math.max(1, Math.min(10, qualityScore));

  // Determine extraction recommendation
  let extractionRecommendation: 'extract' | 'generate' | 'hybrid' = 'generate';
  
  if (qualityScore >= 7 && dataType === 'structured') {
    extractionRecommendation = 'extract';
  } else if (qualityScore >= 5 && (dataType === 'structured' || dataType === 'semi_structured')) {
    extractionRecommendation = 'hybrid';
  } else {
    extractionRecommendation = 'generate';
  }

  // Generate content summary
  const contentSummary = generateContentSummary(scrapedContent, sourceCount, dataType, qualityScore);

  return {
    qualityScore,
    hasRealData: qualityScore >= 6 && (dataType === 'structured' || dataType === 'semi_structured'),
    dataType,
    contentSummary,
    extractionRecommendation,
    issues,
    strengths,
    sourceCount,
    totalLength: contentLength
  };
}

function generateContentSummary(
  content: string, 
  sourceCount: number, 
  dataType: string, 
  qualityScore: number
): string {
  const length = content.length;
  
  if (qualityScore >= 8) {
    return `Excellent content quality with ${sourceCount} sources (${Math.round(length/1000)}k chars). Rich ${dataType} data suitable for extraction.`;
  } else if (qualityScore >= 6) {
    return `Good content quality with ${sourceCount} sources (${Math.round(length/1000)}k chars). ${dataType} data available for processing.`;
  } else if (qualityScore >= 4) {
    return `Moderate content quality with ${sourceCount} sources (${Math.round(length/1000)}k chars). Limited ${dataType} data, may need AI generation.`;
  } else {
    return `Poor content quality with ${sourceCount} sources (${Math.round(length/1000)}k chars). Minimal ${dataType} data, AI generation recommended.`;
  }
}
