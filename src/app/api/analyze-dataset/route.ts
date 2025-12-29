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

      const columnPrompt = `You are a technical data analyst.
Dataset schema: ${JSON.stringify(schema)}
Sample rows: ${JSON.stringify(sampleData.slice(0, 5))}
Profile: ${JSON.stringify(analysisResult.profile)}

For each column, provide a concise summary, quality issues, and 1 action. Use technical language.
Return JSON ONLY:
{
  "columnInsights": [
    { "name": "col", "summary": "desc", "qualityIssues": ["issue"], "recommendations": ["action"] }
  ]
}`;

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
        model: process.env.OPENROUTER_MODEL || 'openai/gpt-oss-120b:free',
        maxTokens: 800,
        temperature: 0.2,
      });

      const deepPrompt = `You are a Lead Data Architect at Synthara.
Analyze this comprehensive dataset profile: ${JSON.stringify(analysisResult.profile)}

Your objective is to map "Entity Relationships" across the entire schema. 
Even if the statistical correlation matrix is sparse or empty, use your intelligence to identify:
1. Semantic dependencies between categorical fields (e.g., "Most 'Action' movies have 'High' budgets").
2. Observed hierarchies or logical groupings.
3. Interesting patterns in value distributions across different columns.

Provide:
1. One-sentence technical summary of the dataset's architecture.
2. Top correlation/relationship insights mapped as entities.
3. 3-5 high-priority technical recommendations for synthesis or optimization.

Return JSON ONLY:
{
  "summary": "...",
  "correlations": [
    { "columnA": "First Column", "columnB": "Second Column", "strength": "Strong | Moderate | Weak", "insight": "Describe the semantic or statistical connection." }
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
        model: process.env.OPENROUTER_MODEL || 'openai/gpt-oss-120b:free',
        maxTokens: 800,
        temperature: 0.2,
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
