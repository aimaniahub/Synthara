import { NextRequest, NextResponse } from 'next/server';
import { analysisService } from '@/services/analysis-service';
import { geminiService } from '@/services/gemini-service';

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
    let aiInsights = null;
    try {
      // Use sample data for AI analysis to improve performance
      const sampleData = analysisData.slice(0, Math.min(100, analysisData.length));
      const schema = analysisResult.profile.columns.map(col => ({
        name: col.name,
        type: col.type
      }));

      const columnAnalysis = await geminiService.analyzeDatasetProfile(
        schema,
        sampleData,
        analysisResult.profile
      );

      const deepAnalysis = await geminiService.generateDeepInsights(
        analysisResult.profile,
        analysisResult.profile.correlationMatrix || [],
        {
          numericColumns: analysisResult.profile.numericColumns,
          categoricalColumns: analysisResult.profile.categoricalColumns,
          totalRows: analysisResult.profile.totalRows
        }
      );

      aiInsights = {
        columnInsights: columnAnalysis.success ? columnAnalysis.columnInsights : [],
        deepInsights: deepAnalysis.success ? deepAnalysis : null
      };
    } catch (aiError) {
      console.warn('AI analysis failed:', aiError);
      // Provide fallback insights
      aiInsights = {
        columnInsights: [],
        deepInsights: {
          summary: "AI analysis temporarily unavailable. Please try again later.",
          correlations: [],
          recommendations: []
        }
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
