import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function toCsvRows(rows: Record<string, any>[], columns: string[]): string[] {
  return rows.map((row) =>
    columns
      .map((col) => {
        const v = row[col];
        if (v === null || v === undefined) return '';
        const s = String(v);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      })
      .join(',')
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const datasetId: string | undefined = body?.datasetId;
    const columns: string[] = Array.isArray(body?.columns) ? body.columns : [];
    const rows: any[] = Array.isArray(body?.rows) ? body.rows : [];

    if (!datasetId || !columns.length || !rows.length) {
      return NextResponse.json(
        { success: false, error: 'datasetId, columns, and rows are required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: dataset, error: fetchErr } = await supabase
      .from('generated_datasets')
      .select('id, data_csv, num_rows, user_id')
      .eq('id', datasetId)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !dataset) {
      return NextResponse.json({ success: false, error: fetchErr?.message || 'Dataset not found' }, { status: 404 });
    }

    const existingCsv: string = dataset.data_csv || '';

    // Build CSV rows for the cleaned data (no header)
    const newRows = toCsvRows(rows, columns);

    // Ensure header exists in existing CSV and append correctly
    // We assume provided columns match the existing header order.
    const needsNewline = existingCsv.length > 0 && !existingCsv.endsWith('\n');
    const appendedCsv = existingCsv + (needsNewline ? '\n' : '') + newRows.join('\n');

    const newCount = (dataset.num_rows || 0) + rows.length;

    const { error: updateErr } = await supabase
      .from('generated_datasets')
      .update({ data_csv: appendedCsv, num_rows: newCount })
      .eq('id', datasetId)
      .eq('user_id', user.id);

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, addedRows: rows.length, numRows: newCount });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to append cleaned data' }, { status: 500 });
  }
}
