import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    return NextResponse.next();
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // If the cookie is set, update the request cookies and re-generate the response
          // to ensure the updated cookies are passed to the server components.
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          // If the cookie is removed, update the request cookies and re-generate the response
          // to ensure the updated cookies are passed to the server components.
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Crucial: This call refreshes the session and potentially updates cookies via the `set` handler.
  async function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
    let timeout: any;
    const timeoutPromise = new Promise<T>((resolve) => {
      timeout = setTimeout(() => resolve(fallback), ms);
    });
    p.catch(() => null);
    return Promise.race([p, timeoutPromise]).finally(() => clearTimeout(timeout)) as Promise<T>;
  }

  let user = null;
  try {
    const { data } = await withTimeout<any>(
      supabase.auth.getUser(),
      2000,
      { data: { user: null } }
    );
    user = data?.user ?? null;
  } catch (error: any) {
    // Handle invalid refresh token error gracefully by clearing stale cookies
    console.warn('[Middleware] Auth error, clearing session:', error?.message);

    // Clear Supabase auth cookies to force fresh login
    const cookiesToClear = ['sb-otpghqglrqbytbladyqa-auth-token', 'sb-otpghqglrqbytbladyqa-auth-token-code-verifier'];
    for (const cookieName of cookiesToClear) {
      response.cookies.set(cookieName, '', { maxAge: 0, path: '/' });
    }
    user = null;
  }

  const { pathname } = request.nextUrl

  // Protected routes: /dashboard and its children
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      // If no user and trying to access a protected route, redirect to auth page
      const url = new URL('/auth', request.url)
      url.searchParams.set('next', pathname) // Add original path as "next" for redirect after login
      return NextResponse.redirect(url)
    }
  }

  // If user is logged in and tries to access /auth, redirect to dashboard
  // Exclude auth callback and error routes from this redirection.
  if (user && pathname.startsWith('/auth') && pathname !== '/auth/callback' && pathname !== '/auth/auth-code-error') {
    const url = new URL('/dashboard', request.url)
    url.searchParams.delete('next') // Clear next param as we are going to dashboard
    return NextResponse.redirect(url)
  }

  // Return the response, which may have updated cookies from supabase.auth.getUser()
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/dashboard/:path*',
  ],
}
