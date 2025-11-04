import { NextRequest, NextResponse } from 'next/server';
import { getUserDatasets } from '@/lib/supabase/actions';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10) || 20)) : 20;

    const datasets = await getUserDatasets(limit);
    return NextResponse.json({ success: true, datasets });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to list datasets',
      },
      { status: 500 }
    );
  }
}
