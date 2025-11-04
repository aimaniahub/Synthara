import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    if (!url || !anon) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 });
    }
    const supabase = createServerClient(url, anon, { cookies: { get() { return undefined; }, set() {}, remove() {} } });

    const { data, error } = await supabase
      .from('generated_datasets')
      .select('id, created_at, dataset_name, num_rows, user_id')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, datasets: data || [] });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
