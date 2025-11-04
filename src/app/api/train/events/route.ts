import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const { jobId, epoch, progress, metrics, message } = body || {};

    if (!jobId || typeof epoch !== 'number' || typeof progress !== 'number') {
      return NextResponse.json({ success: false, error: 'Missing jobId/epoch/progress' }, { status: 400 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Insert log row
    const { error: insertError } = await supabase
      .from('training_logs')
      .insert({
        job_id: jobId,
        user_id: user.id,
        epoch,
        progress,
        metrics: metrics || null,
        message: message || null,
      });

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    // Update job state
    const { error: updateError } = await supabase
      .from('training_jobs')
      .update({ current_epoch: epoch, progress, last_metrics: metrics || null, status: 'RUNNING' })
      .eq('id', jobId)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to record event' }, { status: 500 });
  }
}
