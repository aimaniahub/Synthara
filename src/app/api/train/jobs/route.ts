import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const { datasetName, config } = body || {};

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const insert = {
      user_id: user.id,
      dataset_name: datasetName || null,
      config: config || {},
      status: 'RUNNING',
      total_epochs: Number(config?.epochs) || 0,
      current_epoch: 0,
      progress: 0,
    };

    const { data, error } = await supabase
      .from('training_jobs')
      .insert(insert)
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, jobId: data?.id });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to create job' }, { status: 500 });
  }
}
