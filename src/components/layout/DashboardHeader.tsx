
"use client";

import Link from 'next/link';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Search, Settings, User, LifeBuoy, Menu, LogOut, LogIn } from 'lucide-react';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { SyntharaLogo } from '../icons/SyntharaLogo';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { User as SupabaseUser } from '@supabase/supabase-js';

import { Breadcrumbs } from './Breadcrumbs';

export function DashboardHeader() {
  const { isMobile } = useSidebar();
  const [hasMounted, setHasMounted] = React.useState(false);
  const [user, setUser] = React.useState<SupabaseUser | null>(null);
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  React.useEffect(() => {
    setHasMounted(true);
    if (!supabase) return;
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') {
        router.refresh();
      }
      if (event === 'SIGNED_IN') {
        router.refresh();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, router]);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const commonRightContent = (
    <div className="flex items-center gap-2 sm:gap-4">
      <div className="hidden lg:flex items-center gap-1 group">
        <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/80">System Online</span>
      </div>

      <div className="h-4 w-px bg-border/40 mx-2 hidden sm:block" />

      <ThemeToggle />

      <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted hidden sm:flex h-10 w-10 border border-transparent hover:border-border/50 transition-all" aria-label="Notifications">
        <Bell className="h-4.5 w-4.5" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted h-10 w-10 border border-transparent hover:border-border/50 transition-all">
            <Avatar className="h-8 w-8 rounded-lg border">
              <AvatarImage src={user?.user_metadata?.avatar_url || ""} alt={user?.email || "User Avatar"} />
              <AvatarFallback className="text-xs bg-muted text-foreground font-black">{user?.email ? user.email.charAt(0).toUpperCase() : "U"}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 shadow-2xl rounded-2xl p-2 border-border/50 backdrop-blur-xl">
          {user ? (
            <>
              <DropdownMenuLabel className="p-3">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-black leading-none text-foreground">{user.user_metadata?.full_name || user.email}</p>
                  <p className="text-[10px] leading-none text-muted-foreground font-medium mt-1">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/40 my-1" />
              <DropdownMenuItem className="rounded-xl py-2 font-bold cursor-pointer" asChild>
                <Link href="/dashboard/profile"><User className="mr-2.5 h-4 w-4" />Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl py-2 font-bold cursor-pointer" asChild>
                <Link href="/dashboard/settings"><Settings className="mr-2.5 h-4 w-4" />Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl py-2 font-bold cursor-pointer" asChild>
                <Link href="/help"><LifeBuoy className="mr-2.5 h-4 w-4" />Support</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/40 my-1" />
              <DropdownMenuItem className="rounded-xl py-2 font-bold text-destructive focus:text-destructive cursor-pointer" onClick={handleSignOut}>
                <LogOut className="mr-2.5 h-4 w-4" />Terminate Session
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem asChild>
              <Link href="/auth"><LogIn className="mr-2.5 h-4 w-4" />Sign In</Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  if (!hasMounted) {
    return (
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b bg-background/50 backdrop-blur-xl px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
        </div>
        <div className="h-10 w-32 rounded-xl bg-muted animate-pulse" />
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-border/40 bg-background/50 backdrop-blur-xl px-4 sm:px-6">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <SidebarTrigger className="h-10 w-10 hover:bg-muted rounded-xl border border-transparent hover:border-border/50 transition-all flex-shrink-0" />
        <div className="h-5 w-px bg-border/40 mx-2 hidden md:block" />
        <div className="hidden sm:block flex-shrink-0">
          <Breadcrumbs />
        </div>
      </div>

      {commonRightContent}
    </header>
  );
}
