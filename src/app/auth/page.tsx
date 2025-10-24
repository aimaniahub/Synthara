import { AuthForm } from '@/components/auth/AuthForm';
import { SyntharaLogo } from '@/components/icons/SyntharaLogo';
import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function AuthPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect('/dashboard');
  }
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-purple relative overflow-hidden p-3 sm:p-4 lg:p-6">
      {/* Background geometric patterns */}
      <div className="absolute inset-0 opacity-20">
        <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
          <path d="M0,0 Q250,100 500,0 T1000,0 L1000,300 Q750,200 500,300 T0,300 Z" fill="url(#gradient1)" />
          <path d="M0,700 Q250,600 500,700 T1000,700 L1000,1000 L0,1000 Z" fill="url(#gradient2)" />
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(139, 92, 246, 0.3)" />
              <stop offset="100%" stopColor="rgba(79, 70, 229, 0.3)" />
            </linearGradient>
            <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(79, 70, 229, 0.3)" />
              <stop offset="100%" stopColor="rgba(139, 92, 246, 0.3)" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
        <Link href="/" aria-label="Synthara AI Homepage">
          <SyntharaLogo className="h-8 sm:h-9 lg:h-10 w-auto text-white" />
        </Link>
      </div>

      <div className="w-full max-w-sm sm:max-w-md space-y-6 sm:space-y-8 relative z-10">
        <Suspense fallback={
          <div className="text-center text-sm sm:text-base text-white/70">Loading...</div>
        }>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  );
}
