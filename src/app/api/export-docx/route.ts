import { NextResponse } from 'next/server';
import { getDOCXExportService } from '@/services/docx-export-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      datasetName,
      profile,
      insights,
      rawData,
      exportType = 'text-with-tables',
    } = body || {};

    if (!datasetName || !profile || !insights) {
      return NextResponse.json(
        { error: 'Missing required fields: datasetName, profile, insights' },
        { status: 400 }
      );
    }

    const analysisDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const service = getDOCXExportService();
    const buffer = await service.generateReport({
      datasetName,
      analysisDate,
      profile,
      insights,
      rawData,
      exportType,
    });

    const filename = `${String(datasetName).replace(/[^a-z0-9]/gi, '_').toLowerCase()}_analysis_report.docx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Export DOCX API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate DOCX' },
      { status: 500 }
    );
  }
}
