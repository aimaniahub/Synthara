
import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  // Only create client on the client side
  if (typeof window === 'undefined') {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const placeholderUrls = ['YOUR_SUPABASE_URL_HERE', 'your_supabase_project_url_here'];
  const placeholderKeys = ['YOUR_SUPABASE_ANON_KEY_HERE', 'your_supabase_anon_key_here'];

  if (
    !supabaseUrl ||
    typeof supabaseUrl !== 'string' ||
    supabaseUrl.trim() === '' ||
    placeholderUrls.includes(supabaseUrl) ||
    !/^https?:\/\/[a-z0-9-]+\.supabase\.co/.test(supabaseUrl)
  ) {
    console.warn('[Supabase Client] NEXT_PUBLIC_SUPABASE_URL is not properly configured');
    return null;
  }
  if (
    !supabaseAnonKey ||
    typeof supabaseAnonKey !== 'string' ||
    supabaseAnonKey.trim() === '' ||
    placeholderKeys.includes(supabaseAnonKey)
  ) {
    console.warn('[Supabase Client] NEXT_PUBLIC_SUPABASE_ANON_KEY is not properly configured');
    return null;
  }

  try {
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey);
    return client;
  } catch (e: any) {
    console.error("[Supabase Client] Error during Supabase client creation:", e);
    return null;
  }
}
