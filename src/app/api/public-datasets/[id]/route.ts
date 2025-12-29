import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    if (!url || !anon) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 });
    }
    const supabase = createServerClient(url, anon, { cookies: { get() { return undefined; }, set() { }, remove() { } } });

    const { data, error } = await supabase
      .from('generated_datasets')
      .select('id, created_at, dataset_name, prompt_used, num_rows, schema_json, data_csv, user_id, is_public')
      .eq('id', id)
      .eq('is_public', true)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }

    return NextResponse.json({ success: true, dataset: data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
