import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

    // Check Supabase connection
    try {
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
          },
        }
      );
      
      const { error } = await supabase.from('user_activities').select('count').limit(1);
      health.services.database = error ? 'unhealthy' : 'healthy';
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
