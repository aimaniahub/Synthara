import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getSupabaseClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error('Supabase environment variables not configured');
  }

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Ignore errors in read-only context
        }
      },
      remove(name: string, options: Record<string, unknown>) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // Ignore errors in read-only context
        }
      },
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10) || 20)) : 20;

    // Create Supabase client directly in API route
    const supabase = await getSupabaseClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('Auth error in datasets API:', authError.message);
      return NextResponse.json(
        { success: false, error: 'Authentication error', details: authError.message },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Fetch datasets (exclude data_csv for performance)
    const { data: datasets, error: dbError } = await supabase
      .from('generated_datasets')
      .select('id, created_at, dataset_name, prompt_used, num_rows, schema_json, feedback, user_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (dbError) {
      // Handle table not found gracefully
      if (dbError.code === 'PGRST116' || dbError.message.includes('does not exist')) {
        console.warn('Generated datasets table not found');
        return NextResponse.json({ success: true, datasets: [] });
      }

      console.error('Database error fetching datasets:', dbError.message);
      return NextResponse.json(
        { success: false, error: 'Database error', details: dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, datasets: datasets || [] });
  } catch (error) {
    console.error('Error listing datasets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
