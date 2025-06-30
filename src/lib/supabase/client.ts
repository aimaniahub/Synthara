
import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  // During build time, environment variables might not be available
  // Return null to handle gracefully during static generation
  if (typeof window === 'undefined') {
    // We're on the server during build time
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey ||
        supabaseUrl === 'YOUR_SUPABASE_URL_HERE' ||
        supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY_HERE') {
      console.warn('[Supabase Client] Environment variables not set during build time. This is expected during deployment.');
      return null;
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || typeof supabaseUrl !== 'string' || supabaseUrl.trim() === '' || supabaseUrl === 'YOUR_SUPABASE_URL_HERE') {
    throw new Error(`Supabase URL is not properly defined, is empty, or is still the placeholder value. Please check your NEXT_PUBLIC_SUPABASE_URL environment variable in a .env.local file, ensure it's your actual Supabase project URL, and that the development server was restarted.`);
  }
  if (!supabaseAnonKey || typeof supabaseAnonKey !== 'string' || supabaseAnonKey.trim() === '' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY_HERE') {
    throw new Error(`Supabase anonymous key is not properly defined, is empty, or is still the placeholder value. Please check your NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable in a .env.local file, ensure it's your actual Supabase anonymous key, and that the development server was restarted.`);
  }

  try {
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey);
    return client;
  } catch (e: any) {
    console.error("[Supabase Client] Error during Supabase client creation:", e);
    throw new Error(`Failed to initialize Supabase client. Original error: ${e.message}. Ensure NEXT_PUBLIC_SUPABASE_URL is a valid URL.`);
  }
}
