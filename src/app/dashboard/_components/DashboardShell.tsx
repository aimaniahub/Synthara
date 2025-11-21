"use client";

import React, { useEffect } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { mainNavItems, userNavItems, helpNavItems } from "@/lib/navigation";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          router.push("/auth");
          router.refresh();
        } else if (
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED"
        ) {
          router.refresh();
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <SidebarProvider defaultOpen={false} className="sidebar-provider relative z-10">
      {/* Mobile Sidebar */}
      <Sidebar
        side="left"
        collapsible="offcanvas"
        className="md:hidden flex flex-col modern-card border-r border-border/80"
        style={{
          // @ts-ignore
          "--sidebar-width": "22rem",
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

      {/* Desktop Sidebar */}
      <Sidebar
        side="left"
        collapsible="icon"
        className="hidden md:flex flex-col modern-card border-r border-border/80"
        style={{
          // @ts-ignore
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "4rem",
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
          <div className="mx-auto max-w-7xl w-full space-y-6 sm:space-y-8">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
