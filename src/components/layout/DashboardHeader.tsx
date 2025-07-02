
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
    <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
      <ThemeToggle />
      <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground hidden sm:flex" aria-label="Notifications">
        <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border-2 border-primary/50">
              <AvatarImage src={user?.user_metadata?.avatar_url || ""} alt={user?.email || "User Avatar"}/>
              <AvatarFallback className="text-xs sm:text-sm">{user?.email ? user.email.charAt(0).toUpperCase() : "U"}</AvatarFallback>
            </Avatar>
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 shadow-xl">
          {user ? (
            <>
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none text-foreground">{user.user_metadata?.full_name || user.email}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile"><User className="mr-2.5 h-4 w-4 text-muted-foreground" />Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings"><Settings className="mr-2.5 h-4 w-4 text-muted-foreground" />Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/help"><LifeBuoy className="mr-2.5 h-4 w-4 text-muted-foreground" />Support</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2.5 h-4 w-4 text-muted-foreground" />Sign Out
              </DropdownMenuItem>
            </>
          ) : (
             <DropdownMenuItem asChild>
                <Link href="/auth"><LogIn className="mr-2.5 h-4 w-4 text-muted-foreground" />Sign In</Link>
              </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const searchBar = (
     <form className="relative flex-1 max-w-sm lg:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
            type="search"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 text-sm rounded-lg shadow-inner bg-background focus:bg-card border-border hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary"
            aria-label="Search"
            disabled
        />
    </form>
  );

  if (!hasMounted) {
    return (
      <header className="sticky top-0 z-40 flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4 border-b bg-card px-3 sm:px-4 md:px-6 shadow-md">
        <div className="flex items-center gap-2 sm:gap-4">
            <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-md bg-muted" /> {/* SidebarTrigger placeholder */}
        </div>
        <div className="h-8 w-20 sm:h-9 sm:w-24 md:w-32 rounded-md bg-muted" /> {/* Right content placeholder */}
      </header>
    );
  }
  
  return (
    <header className="sticky top-0 z-40 flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4 border-b bg-card px-3 sm:px-4 md:px-6 shadow-md">
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground">
          <Menu className="h-5 w-5 sm:h-6 sm:w-6"/>
        </SidebarTrigger>
        <div className="hidden md:block flex-1">{searchBar}</div>
      </div>

      {commonRightContent}
    </header>
  );
}
