import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
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

      const columnPrompt = `You are a senior data analyst.

Dataset schema:
${JSON.stringify(schema, null, 2)}

Sample rows (up to 100):
${JSON.stringify(sampleData.slice(0, 20), null, 2)}

Profile summary:
${JSON.stringify(analysisResult.profile, null, 2)}

For each column, provide:
- A short human-readable description of what the column represents
- Notable quality issues (missing values, outliers, skew, etc.)
- Concrete recommendations to improve data quality or usage

Return JSON only:
{
  "columnInsights": [
    {
      "name": "column_name",
      "summary": "short description",
      "qualityIssues": ["issue 1", "issue 2"],
      "recommendations": ["recommendation 1", "recommendation 2"]
    }
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
              summary: 'short description',
              qualityIssues: ['issue 1'],
              recommendations: ['recommendation 1'],
            },
          ],
        },
        model: process.env.OPENROUTER_MODEL || 'tngtech/deepseek-r1t2-chimera:free',
        maxTokens: 2000,
        temperature: 0.3,
      });

      const deepPrompt = `You are a senior data scientist.

Dataset profile:
${JSON.stringify(analysisResult.profile, null, 2)}

Correlation matrix (may be empty):
${JSON.stringify(analysisResult.profile.correlationMatrix || [], null, 2)}

Numeric columns: ${JSON.stringify(analysisResult.profile.numericColumns || [])}
Categorical columns: ${JSON.stringify(analysisResult.profile.categoricalColumns || [])}
Total rows: ${analysisResult.profile.totalRows}

Provide high-level insights about this dataset, including:
- A concise summary of what the dataset seems to capture
- Interesting correlations or relationships
- Actionable recommendations for feature engineering or further analysis

Return JSON only:
{
  "summary": "short paragraph",
  "correlations": [
    { "columnA": "col1", "columnB": "col2", "strength": "weak|moderate|strong", "insight": "text" }
  ],
  "recommendations": ["rec 1", "rec 2"]
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
          summary: 'short paragraph',
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
        model: process.env.OPENROUTER_MODEL || 'tngtech/deepseek-r1t2-chimera:free',
        maxTokens: 2000,
        temperature: 0.3,
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
