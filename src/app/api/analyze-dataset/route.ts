import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes for AI operations
import { analysisService } from '@/services/analysis-service';
import { SimpleAI } from '@/ai/simple-ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, datasetId } = body;

    if (!data && !datasetId) {
      return NextResponse.json(
        { error: 'Either data or datasetId is required' },
        { status: 400 }
      );
    }

    let analysisData = data;

    // If datasetId is provided, fetch the dataset
    if (datasetId && !data) {
      // This would typically fetch from database
      // For now, we'll assume data is provided directly
      return NextResponse.json(
        { error: 'Dataset fetching not implemented in this endpoint' },
        { status: 501 }
      );
    }

    if (!Array.isArray(analysisData) || analysisData.length === 0) {
      return NextResponse.json(
        { error: 'Invalid data format' },
        { status: 400 }
      );
    }

    // Perform statistical analysis
    const analysisResult = analysisService.analyzeDataset(analysisData);

    // Generate AI insights (always include for better UX)
    let aiInsights: any = null;
    try {
      // Use sample data for AI analysis to improve performance
      const sampleData = analysisData.slice(0, Math.min(100, analysisData.length));
      const schema = analysisResult.profile.columns.map((col: any) => ({
        name: col.name,
        type: col.type,
      }));

      const columnPrompt = `You are a Lead Data Scientist at Synthara.
Analyze these dataset column profiles and provide structured JSON insights.

Rules:
- DO NOT provide any reasoning, thinking, or introduction text.
- START your response directly with the opening bracket {
- ENSURE the output is strictly valid JSON.

Data Quality Legend:
- missingness: percentage of null values
- health: 100 - missingness

Columns for analysis:
${JSON.stringify(analysisResult.profile.columns, null, 2)}
`;

      const columnAnalysis = await SimpleAI.generateWithSchema<{
        columnInsights: Array<{
          name: string;
          summary: string;
          qualityIssues: string[];
          recommendations: string[];
        }>;
      }>({
        prompt: columnPrompt,
        schema: {
          columnInsights: [
            {
              name: 'column_name',
              summary: 'summary',
              qualityIssues: ['issue'],
              recommendations: ['rec'],
            },
          ],
        },
        model: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-nano-30b-a3b:free',
        maxTokens: 4000,
        temperature: 0.2,
      });

      const deepPrompt = `You are a Lead Data Architect at Synthara.
Analyze this comprehensive dataset profile: ${JSON.stringify(analysisResult.profile)}

Task: Identify entity relationships and provide high-priority technical recommendations.

Rules:
- DO NOT provide any reasoning, thinking, or introduction text.
- START your response directly with the opening bracket {
- ENSURE the output is strictly valid JSON.

JSON Structure:
{
  "summary": "one sentence architecture summary",
  "correlations": [
    { "columnA": "...", "columnB": "...", "strength": "Strong|Moderate|Weak", "insight": "..." }
  ],
  "recommendations": ["..."]
}`;

      const deepAnalysis = await SimpleAI.generateWithSchema<{
        summary: string;
        correlations: Array<{
          columnA: string;
          columnB: string;
          strength: string;
          insight: string;
        }>;
        recommendations: string[];
      }>({
        prompt: deepPrompt,
        schema: {
          summary: 'summary',
          correlations: [
            {
              columnA: 'col1',
              columnB: 'col2',
              strength: 'weak',
              insight: 'text',
            },
          ],
          recommendations: ['rec 1'],
        },
        model: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-nano-30b-a3b:free',
        maxTokens: 1000, // Increased maxTokens for deep analysis
        temperature: 0.3, // Slightly increased temperature for more creative insights
      });

      aiInsights = {
        columnInsights: Array.isArray(columnAnalysis.columnInsights) ? columnAnalysis.columnInsights : [],
        deepInsights: {
          summary: deepAnalysis.summary || '',
          correlations: Array.isArray(deepAnalysis.correlations) ? deepAnalysis.correlations : [],
          recommendations: Array.isArray(deepAnalysis.recommendations) ? deepAnalysis.recommendations : [],
        },
      };
    } catch (aiError) {
      console.warn('AI analysis failed:', aiError);
      // Provide fallback insights
      aiInsights = {
        columnInsights: [],
        deepInsights: {
          summary: 'AI analysis temporarily unavailable. Please try again later.',
          correlations: [],
          recommendations: [],
        },
      };
    }

    // Merge AI insights into analysis result
    const completeAnalysis = {
      ...analysisResult,
      aiInsights
    };

    return NextResponse.json({
      success: true,
      analysis: completeAnalysis,
      metadata: {
        analyzedAt: new Date().toISOString(),
        dataSize: analysisData.length,
        columns: analysisResult.profile.totalColumns
      }
    });

  } catch (error) {
    console.error('Analysis API error:', error);
    return NextResponse.json(
      {
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
