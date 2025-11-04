import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const sinceEpochStr = searchParams.get('sinceEpoch');

    if (!jobId) {
      return NextResponse.json({ success: false, error: 'Missing jobId' }, { status: 400 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let query = supabase.from('training_logs')
      .select('*')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .order('epoch', { ascending: true })
      .order('id', { ascending: true });

    const sinceEpoch = sinceEpochStr ? Number(sinceEpochStr) : null;
    if (sinceEpoch && !Number.isNaN(sinceEpoch)) {
      query = query.gte('epoch', sinceEpoch);
    }

    const { data, error } = await query.limit(200);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, logs: data || [] });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to fetch logs' }, { status: 500 });
  }
}
