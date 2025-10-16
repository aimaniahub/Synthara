import { NextRequest, NextResponse } from 'next/server';
import { getDatasetById } from '@/lib/supabase/actions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: datasetId } = await params;
    
    if (!datasetId) {
      return NextResponse.json(
        { error: 'Dataset ID is required' },
        { status: 400 }
      );
    }

    const dataset = await getDatasetById(datasetId);
    
    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(dataset);
  } catch (error) {
    console.error('Error fetching dataset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Add generateStaticParams for static generation
export async function generateStaticParams() {
  // Return empty array for dynamic routes that don't need static generation
  return [];
}