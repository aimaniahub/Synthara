import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { datasetId, newName } = await req.json();
    if (!datasetId) {
      return NextResponse.json({ success: false, error: 'datasetId is required' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the public dataset (RLS allows public read when is_public = true)
    const { data: pub, error: fetchErr } = await supabase
      .from('generated_datasets')
      .select('*')
      .eq('id', datasetId)
      .eq('is_public', true)
      .single();
    if (fetchErr || !pub) {
      return NextResponse.json({ success: false, error: fetchErr?.message || 'Public dataset not found' }, { status: 404 });
    }

    // Insert a copy for this user
    const { data: inserted, error: insErr } = await supabase
      .from('generated_datasets')
      .insert({
        user_id: user.id,
        dataset_name: newName || `Imported - ${pub.dataset_name}`,
        prompt_used: pub.prompt_used || 'Imported from public dataset',
        num_rows: pub.num_rows,
        schema_json: pub.schema_json,
        data_csv: pub.data_csv,
        feedback: pub.feedback || null,
        is_public: false,
      })
      .select('id')
      .single();

    if (insErr || !inserted) {
      return NextResponse.json({ success: false, error: insErr?.message || 'Failed to import' }, { status: 500 });
    }

    return NextResponse.json({ success: true, datasetId: inserted.id });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
