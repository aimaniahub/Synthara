
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

export function DashboardHeader() {
  const { isMobile } = useSidebar();
  const [hasMounted, setHasMounted] = React.useState(false);
  const [user, setUser] = React.useState<SupabaseUser | null>(null);
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  React.useEffect(() => {
    setHasMounted(true);
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') {
        router.refresh(); // Refresh to ensure server components reflect logout
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
    await supabase.auth.signOut();
    router.push('/auth'); // Redirect to auth page after sign out
  };

  const commonRightContent = (
    <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
      <ThemeToggle />
      <Button variant="ghost" size="icon" className="rounded-full text-white/70 hover:text-white hover:bg-white/10 hidden sm:flex h-8 w-8 sm:h-9 sm:w-9" aria-label="Notifications">
        <Bell className="h-4 w-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 h-8 w-8 sm:h-9 sm:w-9">
            <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border-2 border-emerald-400/50">
              <AvatarImage src={user?.user_metadata?.avatar_url || ""} alt={user?.email || "User Avatar"}/>
              <AvatarFallback className="text-xs bg-emerald-500 text-white">{user?.email ? user.email.charAt(0).toUpperCase() : "U"}</AvatarFallback>
            </Avatar>
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 shadow-xl glass-card border-white/20">
          {user ? (
            <>
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none text-white">{user.user_metadata?.full_name || user.email}</p>
                  <p className="text-xs leading-none text-white/70">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/20" />
              <DropdownMenuItem asChild className="text-white/80 hover:text-white hover:bg-white/10">
                <Link href="/dashboard/profile"><User className="mr-2.5 h-4 w-4 text-white/70" />Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-white/80 hover:text-white hover:bg-white/10">
                <Link href="/dashboard/settings"><Settings className="mr-2.5 h-4 w-4 text-white/70" />Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-white/80 hover:text-white hover:bg-white/10">
                <Link href="/help"><LifeBuoy className="mr-2.5 h-4 w-4 text-white/70" />Support</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/20" />
              <DropdownMenuItem onClick={handleSignOut} className="text-white/80 hover:text-white hover:bg-white/10">
                <LogOut className="mr-2.5 h-4 w-4 text-white/70" />Sign Out
              </DropdownMenuItem>
            </>
          ) : (
             <DropdownMenuItem asChild className="text-white/80 hover:text-white hover:bg-white/10">
                <Link href="/auth"><LogIn className="mr-2.5 h-4 w-4 text-white/70" />Sign In</Link>
              </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const searchBar = (
     <form className="relative flex-1 w-full max-w-sm lg:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
        <Input
            type="search"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 text-sm rounded-lg glass border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:bg-white/15 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 h-9 sm:h-10"
            aria-label="Search"
            disabled
        />
    </form>
  );

  if (!hasMounted) {
    return (
      <header className="sticky top-0 z-40 flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4 border-b border-white/10 glass-card px-3 sm:px-4 md:px-6 shadow-xl">
        <div className="flex items-center gap-2 sm:gap-4">
            <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-md bg-white/20" /> {/* SidebarTrigger placeholder */}
        </div>
        <div className="h-8 w-20 sm:h-9 sm:w-24 md:w-32 rounded-md bg-white/20" /> {/* Right content placeholder */}
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4 border-b border-slate-200/50 dark:border-slate-700/50 modern-card px-4 sm:px-6 shadow-lg">
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">

        <div className="hidden sm:block flex-1 max-w-sm md:max-w-md">{searchBar}</div>
      </div>

      {commonRightContent}
    </header>
  );
}
