
"use client";

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import { SyntharaLogo } from '@/components/icons/SyntharaLogo';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { mainNavItems, userNavItems, helpNavItems } from '@/lib/navigation';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // If Supabase client is not available (e.g., during build), skip auth
    if (!supabase) {
      return;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          // Explicitly redirect to /auth if user signs out or session becomes invalid
          router.push('/auth');
          router.refresh(); // Refresh to ensure server components also update
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
           // Refresh the page to ensure server components have the latest user session
          router.refresh();
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);


  return (
    <SidebarProvider defaultOpen>
      <Sidebar 
        side="left" 
        collapsible="icon" 
        className="hidden md:flex flex-col border-r border-sidebar-border shadow-lg"
        style={{
          // @ts-ignore
          '--sidebar-width': '17rem', 
          '--sidebar-width-icon': '3.5rem', 
        }}
      >
        <SidebarHeader className="p-4 h-16 flex items-center border-b border-sidebar-border">
           <Link href="/dashboard" className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
            <SyntharaLogo className="h-9 w-auto text-sidebar-primary group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8" />
            <span className="font-headline text-2xl font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              Synthara
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="flex-grow p-0 overflow-y-auto">
          <SidebarNav navItems={mainNavItems} groupLabel="Main Tools" />
          <SidebarNav navItems={userNavItems} groupLabel="User Account" />
        </SidebarContent>
        <SidebarFooter className="p-2 border-t border-sidebar-border">
          <SidebarNav navItems={helpNavItems} />
        </SidebarFooter>
      </Sidebar>
      
      <div className="flex flex-col flex-1 min-h-screen bg-secondary/30 dark:bg-background">
        <DashboardHeader />
        <SidebarInset className="flex-1 overflow-y-auto">
          <main className="p-6 md:p-8 lg:p-10">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
