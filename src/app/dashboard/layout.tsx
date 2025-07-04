
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
    <div className="min-h-screen bg-gradient-light dark:bg-gradient-slate">
      {/* Modern background patterns */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute top-0 left-0 w-full h-full">
          <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
            <defs>
              <linearGradient id="modernGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(59, 130, 246, 0.2)" />
                <stop offset="100%" stopColor="rgba(147, 197, 253, 0.1)" />
              </linearGradient>
              <linearGradient id="modernGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(147, 197, 253, 0.1)" />
                <stop offset="100%" stopColor="rgba(59, 130, 246, 0.2)" />
              </linearGradient>
            </defs>
            <path d="M0,0 Q300,80 600,0 T1000,0 L1000,200 Q700,120 400,200 T0,200 Z" fill="url(#modernGradient1)" />
            <path d="M0,800 Q300,720 600,800 T1000,800 L1000,1000 L0,1000 Z" fill="url(#modernGradient2)" />
          </svg>
        </div>
      </div>

      <SidebarProvider defaultOpen={false} className="sidebar-provider relative z-10">
        {/* Mobile Sidebar */}
        <Sidebar
          side="left"
          collapsible="offcanvas"
          className="md:hidden flex flex-col modern-card border-r border-slate-200/50 dark:border-slate-700/50 shadow-xl"
          style={{
            // @ts-ignore
            '--sidebar-width': '22rem',
          }}
        >
          <SidebarHeader className="p-4 h-16 flex items-center border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="w-full text-center">
              <span className="font-headline text-lg font-bold text-slate-800 dark:text-slate-100">
                Navigation
              </span>
            </div>
          </SidebarHeader>
          <SidebarContent className="flex-grow p-0 overflow-y-auto">
            <SidebarNav navItems={mainNavItems} groupLabel="Main Tools" />
            <SidebarNav navItems={userNavItems} groupLabel="User Account" />
          </SidebarContent>
          <SidebarFooter className="p-3 border-t border-slate-200/50 dark:border-slate-700/50">
            <SidebarNav navItems={helpNavItems} />
          </SidebarFooter>
        </Sidebar>

        {/* Desktop Corner Sidebar */}
        <Sidebar
          side="left"
          collapsible="icon"
          className="hidden md:flex flex-col modern-card border-r border-slate-200/50 dark:border-slate-700/50 shadow-xl"
          style={{
            // @ts-ignore
            '--sidebar-width': '16rem',
            '--sidebar-width-icon': '4rem',
          }}
        >
          <SidebarHeader className="p-4 h-16 flex items-center border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="w-full text-center group-data-[collapsible=icon]:hidden">
              <span className="font-headline text-lg font-bold text-slate-800 dark:text-slate-100">
                Menu
              </span>
            </div>
          </SidebarHeader>
          <SidebarContent className="flex-grow p-0 overflow-y-auto">
            <SidebarNav navItems={mainNavItems} groupLabel="Main Tools" />
            <SidebarNav navItems={userNavItems} groupLabel="User Account" />
          </SidebarContent>
          <SidebarFooter className="p-2 border-t border-slate-200/50 dark:border-slate-700/50">
            <SidebarNav navItems={helpNavItems} />
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1 min-h-screen w-full">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10">
            <div className="mx-auto max-w-7xl w-full space-y-6 sm:space-y-8">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}
