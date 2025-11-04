import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const { jobId, status, metrics, artifactPath, message } = body || {};

    if (!jobId || !status) {
      return NextResponse.json({ success: false, error: 'Missing jobId/status' }, { status: 400 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const values: any = {
      status,
      last_metrics: metrics || null,
    };
    if (artifactPath) values.artifact_path = artifactPath;

    const { error } = await supabase
      .from('training_jobs')
      .update(values)
      .eq('id', jobId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (message) {
      await supabase.from('training_logs').insert({
        job_id: jobId,
        user_id: user.id,
        epoch: 0,
        progress: 100,
        metrics: metrics || null,
        message,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to finalize job' }, { status: 500 });
  }
}
