import { AuthForm } from '@/components/auth/AuthForm';
import { SyntharaLogo } from '@/components/icons/SyntharaLogo';
import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function AuthPage() {
  const supabase = await createSupabaseServerClient();
  async function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
    return Promise.race([
      p,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
    ]) as Promise<T>;
  }
  const { data: { user } = { user: null } } = supabase
    ? await withTimeout<any>(supabase.auth.getUser(), 2000, { data: { user: null } })
    : ({ data: { user: null } } as any);
  if (user) {
    redirect('/dashboard');
  }
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background relative overflow-hidden p-3 sm:p-4 lg:p-6">
      {/* Background removed for monochrome */}
      <div className="hidden" />

      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
        <Link href="/" aria-label="Synthara AI Homepage">
          <SyntharaLogo className="h-8 sm:h-9 lg:h-10 w-auto text-foreground" />
        </Link>
      </div>

      <div className="w-full max-w-sm sm:max-w-md space-y-6 sm:space-y-8 relative z-10">
        <Suspense fallback={
          <div className="text-center text-sm sm:text-base text-muted-foreground">Loading...</div>
        }>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  );
}
