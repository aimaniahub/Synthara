import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const { jobId: providedJobId, config, datasetName, csv } = body || {};

    if (!config || !datasetName || !csv) {
      return NextResponse.json({ success: false, error: 'Missing config/datasetName/csv' }, { status: 400 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure job exists (create if not provided)
    let jobId: string | null = providedJobId || null;
    if (!jobId) {
      const insert = {
        user_id: user.id,
        dataset_name: datasetName || null,
        config: config || {},
        status: 'RUNNING',
        total_epochs: Number(config?.epochs) || 0,
        current_epoch: 0,
        progress: 0,
      };
      const { data: created, error: createErr } = await supabase
        .from('training_jobs')
        .insert(insert)
        .select('id')
        .single();
      if (createErr || !created?.id) {
        return NextResponse.json({ success: false, error: createErr?.message || 'Failed to create job' }, { status: 500 });
      }
      jobId = created.id;
    }

    const trainerUrl = process.env.EXTERNAL_TRAINER_URL || 'http://localhost:8000/train';
    if (!trainerUrl) {
      return NextResponse.json({ success: false, error: 'External trainer service not configured' }, { status: 500 });
    }

    // Kick off training on external service (fire-and-forget)
    try {
      const formData = new FormData();
      formData.append("file", new Blob([csv], { type: 'text/csv' }), 'dataset.csv');
      formData.append("target_column", config?.target || '');
      // Preferred param in FastAPI is `task_type`; API also accepts legacy `model_type`
      const taskType = (config?.modelType as string) || 'auto';
      formData.append("task_type", taskType);

      await fetch(trainerUrl, {
        method: 'POST',
        body: formData,
      });
    } catch (err) {
      // Mark as failed if dispatch fails
      await supabase.from('training_jobs').update({ status: 'FAILED' }).eq('id', jobId).eq('user_id', user.id);
      return NextResponse.json({ success: false, error: 'Failed to contact external trainer service' }, { status: 502 });
    }

    return NextResponse.json({ success: true, jobId });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to start backend training' }, { status: 500 });
  }
}
