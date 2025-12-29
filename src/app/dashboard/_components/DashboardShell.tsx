"use client";

import React, { useEffect } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
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
    <SidebarProvider defaultOpen={true} className="sidebar-provider relative z-10">
      <AppSidebar />

      <div className="flex flex-col flex-1 min-h-screen w-full relative overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto w-full">
          <div className="w-full h-full p-4 sm:p-6 md:p-8 lg:p-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
