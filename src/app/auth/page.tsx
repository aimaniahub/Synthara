import { AuthForm } from '@/components/auth/AuthForm';
import { SyntharaLogo } from '@/components/icons/SyntharaLogo';
import Link from 'next/link';
import { Suspense } from 'react';

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

export default function AuthPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-secondary/70 to-background p-3 sm:p-4 lg:p-6">
       <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
         <Link href="/" aria-label="Synthara AI Homepage">
            <SyntharaLogo className="h-8 sm:h-9 lg:h-10 w-auto" />
          </Link>
       </div>
      <div className="w-full max-w-sm sm:max-w-md space-y-6 sm:space-y-8">
        <Suspense fallback={
          <div className="text-center text-sm sm:text-base text-muted-foreground">Loading...</div>
        }>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  );
}
