import { AuthForm } from '@/components/auth/AuthForm';
import { SyntharaLogo } from '@/components/icons/SyntharaLogo';
import Link from 'next/link';
import { Suspense } from 'react';

export default function AuthPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-secondary/70 to-background p-4">
       <div className="absolute top-6 left-6">
         <Link href="/" aria-label="Synthara AI Homepage">
            <SyntharaLogo className="h-10 w-auto" />
          </Link>
       </div>
      <div className="w-full max-w-md space-y-8">
        <Suspense fallback={<div>Loading...</div>}>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  );
}
