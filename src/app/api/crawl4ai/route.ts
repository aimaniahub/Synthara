import { NextRequest, NextResponse } from 'next/server';

// This is a proxy route that forwards requests to the Python backend
// In production, this would be replaced by a proper Vercel serverless function

export async function GET(request: NextRequest) {
  try {
    // Health check endpoint
    return NextResponse.json({
      status: 'healthy',
      service: 'crawl4ai',
      message: 'Crawl4AI service is running'
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urls, prompt, num_rows, use_ai, ai_model, ai_api_key } = body;

    console.log('[Crawl4AI API] Processing request:', {
      urls: urls?.length || 0,
      prompt: prompt?.substring(0, 50) + '...',
      num_rows,
      use_ai
    });

    // For now, we'll generate synthetic data since the Python backend isn't deployed
    // In production, this would call the actual Python service
    const syntheticData = generateSyntheticData(prompt, num_rows || 10);
    
    // Convert to CSV
    const csv = convertToCSV(syntheticData);
    
    return NextResponse.json({
      success: true,
      data: syntheticData,
      csv: csv,
      tables_found: 0,
      feedback: `Generated ${syntheticData.length} synthetic data rows based on prompt: "${prompt}"`
    });

  } catch (error) {
    console.error('[Crawl4AI API] Error:', error);
    return NextResponse.json({
      success: false,
      data: [],
      csv: '',
      tables_found: 0,
      feedback: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

// Helper function to generate synthetic data
function generateSyntheticData(prompt: string, numRows: number): Array<Record<string, any>> {
  const data = [];
  const keywords = prompt.toLowerCase().match(/\b\w+\b/g) || ['item'];
  
  for (let i = 0; i < numRows; i++) {
    data.push({
      id: i + 1,
      name: `${keywords[i % keywords.length]} ${i + 1}`,
      description: `Generated data for ${prompt.substring(0, 50)}...`,
      value: Math.round((100 + (i * 10.5)) * 100) / 100,
      category: keywords[i % keywords.length],
      created_at: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
      active: i % 3 !== 0,
      url: `https://example.com/${keywords[i % keywords.length]}-${i + 1}`,
      source: 'synthetic'
    });
  }
  
  return data;
}

// Helper function to convert data to CSV
function convertToCSV(data: Array<Record<string, any>>): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma or quote
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}
