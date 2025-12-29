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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: datasetId } = await params;

    if (!datasetId) {
      return NextResponse.json(
        { error: 'Dataset ID is required' },
        { status: 400 }
      );
    }

    // Create Supabase client directly in API route
    const supabase = await getSupabaseClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('Auth error in dataset API:', authError.message);
      return NextResponse.json(
        { error: 'Authentication error', details: authError.message },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Fetch dataset
    const { data: dataset, error: dbError } = await supabase
      .from('generated_datasets')
      .select('*')
      .eq('id', datasetId)
      .eq('user_id', user.id)
      .single();

    if (dbError) {
      // Handle "no rows returned" as 404
      if (dbError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Dataset not found' },
          { status: 404 }
        );
      }

      console.error('Database error fetching dataset:', dbError.message);
      return NextResponse.json(
        { error: 'Database error', details: dbError.message },
        { status: 500 }
      );
    }

    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(dataset);
  } catch (error) {
    console.error('Error fetching dataset:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

// Dynamic route - no static generation needed
export async function generateStaticParams() {
  return [];
}