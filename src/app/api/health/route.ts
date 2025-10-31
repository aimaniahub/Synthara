import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'unknown',
        ai: 'unknown',
        search: 'unknown'
      }
    };

    // Check Supabase connection with short timeout
    try {
      const supabase = await createSupabaseServerClient();
      if (!supabase) {
        health.services.database = 'not_configured';
      } else {
        const withTimeout = async <T,>(p: any, ms: number, fallback: T): Promise<T> =>
          Promise.race([p as Promise<T>, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]) as Promise<T>;

        const { error } = await withTimeout(
          supabase.from('user_activities').select('count').limit(1) as any,
          2000,
          { error: new Error('timeout') } as any
        );
        health.services.database = error ? 'unhealthy' : 'healthy';
      }
    } catch (error) {
      health.services.database = 'unhealthy';
    }

    // Check AI services
    if (process.env.GOOGLE_GEMINI_API_KEY) {
      health.services.ai = 'configured';
    } else {
      health.services.ai = 'not_configured';
    }

    // Check search services
    if (process.env.SERPAPI_KEY) {
      health.services.search = 'configured';
    } else {
      health.services.search = 'not_configured';
    }

    const isHealthy = health.services.database === 'healthy';
    
    return NextResponse.json(health, {
      status: isHealthy ? 200 : 503
    });

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
