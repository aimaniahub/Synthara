
"use client";

import { useState, useTransition } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, LogIn, UserPlus, AlertTriangle, CheckCircle } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const authSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  fullName: z.string().optional(), // Optional in schema, will be manually checked for signUp
});

type AuthFormValues = z.infer<typeof authSchema>;

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn');
  const [isPending, startTransition] = useTransition();

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
    },
  });

  const onSubmit: SubmitHandler<AuthFormValues> = async (data) => {
    setIsSubmitting(true);
    setAuthMessage(null);
    form.clearErrors("fullName"); // Clear previous manual errors
    const nextPath = searchParams.get('next');
    const callbackUrl = `${window.location.origin}/auth/callback${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''}`;

    startTransition(async () => {
      try {
        const supabase = createSupabaseBrowserClient();

        if (!supabase) {
          throw new Error('Authentication service is not available. Please try again later.');
        }

        if (authMode === 'signUp') {
          if (!data.fullName || data.fullName.trim() === '') {
            form.setError('fullName', { type: 'manual', message: 'Full name is required for sign up.' });
            setIsSubmitting(false);
            return;
          }
          const { error } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
              emailRedirectTo: callbackUrl,
              data: {
                full_name: data.fullName, // Save full name to user_metadata
              }
            },
          });
          if (error) throw error;
          setAuthMessage({ type: 'success', text: "Check your email for the confirmation link to complete registration!" });
        } else { // signIn mode
          const { error } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
          });
          if (error) throw error;
          router.push(nextPath || '/dashboard');
          router.refresh();
        }
      } catch (error: any) {
        setAuthMessage({ type: 'error', text: error.error_description || error.message || "An unexpected error occurred." });
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  return (
    <div className="w-full p-6 sm:p-8 border rounded-lg bg-background">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="font-headline text-xl sm:text-2xl lg:text-3xl text-foreground mb-2">
          {authMode === 'signIn' ? 'Welcome Back!' : 'Create Account'}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {authMode === 'signIn' ? 'Sign in to access your Synthara dashboard.' : 'Sign up to start generating synthetic data.'}
        </p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4 sm:space-y-6">
          {authMessage && (
            <Alert variant={authMessage.type === 'error' ? "destructive" : "default"}>
                {authMessage.type === 'error' ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
              <AlertTitle>{authMessage.type === 'error' ? "Authentication Error" : (authMode === 'signUp' ? "Registration Pending" : "Success")}</AlertTitle>
              <AlertDescription>{authMessage.text}</AlertDescription>
            </Alert>
          )}
          {authMode === 'signUp' && (
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-sm sm:text-base">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                {...form.register("fullName")}
                className="py-2.5 sm:py-3 h-auto text-sm sm:text-base"
                disabled={isSubmitting || isPending}
              />
              {form.formState.errors.fullName && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{form.formState.errors.fullName.message}</p>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              {...form.register("email")}
              className="py-2.5 sm:py-3 h-auto text-sm sm:text-base"
              disabled={isSubmitting || isPending}
            />
            {form.formState.errors.email && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm sm:text-base">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a secure password"
              {...form.register("password")}
              className="py-2.5 sm:py-3 h-auto text-sm sm:text-base"
              disabled={isSubmitting || isPending}
            />
            {form.formState.errors.password && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">{form.formState.errors.password.message}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:gap-4 mt-6">
          <Button type="submit" className="w-full text-sm sm:text-base lg:text-lg py-2.5 sm:py-3" disabled={isSubmitting || isPending}>
            {isSubmitting || isPending ? (
              <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            ) : authMode === 'signIn' ? (
              <LogIn className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            )}
            {authMode === 'signIn' ? 'Sign In' : 'Sign Up'}
          </Button>
          <Button
            type="button"
            variant="link"
            className="text-xs sm:text-sm"
            onClick={() => {
              setAuthMode(authMode === 'signIn' ? 'signUp' : 'signIn');
              setAuthMessage(null);
              form.reset();
            }}
            disabled={isSubmitting || isPending}
          >
            <span className="hidden sm:inline">
              {authMode === 'signIn' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </span>
            <span className="sm:hidden">
              {authMode === 'signIn' ? "Sign Up" : "Sign In"}
            </span>
          </Button>
        </div>
      </form>
    </div>
  );
}
