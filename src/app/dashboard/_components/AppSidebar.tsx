"use client";

import * as React from "react";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    useSidebar,
} from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { mainNavItems, userNavItems, helpNavItems } from "@/lib/navigation";
import { SyntharaLogo } from "@/components/icons/SyntharaLogo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, MoreHorizontal, Settings, User } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

export function AppSidebar() {
    const pathname = usePathname();
    const { state, isMobile } = useSidebar();
    const [user, setUser] = React.useState<SupabaseUser | null>(null);
    const supabase = createSupabaseBrowserClient();
    const router = useRouter();

    React.useEffect(() => {
        if (!supabase) return;
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        fetchUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [supabase]);

    const handleSignOut = async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        router.push("/auth");
    };

    return (
        <Sidebar collapsible="icon" className="border-r border-border/50 bg-card/50 backdrop-blur-xl">
            <SidebarHeader className="h-16 flex items-center px-4 border-b border-border/30">
                <Link href="/dashboard" className="flex items-center gap-3 transition-all hover:opacity-80">
                    <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                        <SyntharaLogo className="size-5 fill-current" />
                    </div>
                    <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                        <span className="font-headline text-lg font-black tracking-tight text-foreground">Synthara</span>
                        <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60">Intelligence Hub</span>
                    </div>
                </Link>
            </SidebarHeader>

            <SidebarContent className="px-2 py-4 gap-6 scrollbar-none">
                <SidebarGroup>
                    <SidebarGroupLabel className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-3 group-data-[collapsible=icon]:hidden">
                        Intelligence Core
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarNav navItems={mainNavItems} />
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-3 group-data-[collapsible=icon]:hidden">
                        Operation History
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarNav navItems={userNavItems} />
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="p-4 border-t border-border/30 gap-4">
                <div className="group-data-[collapsible=icon]:hidden">
                    <SidebarNav navItems={helpNavItems} />
                </div>

                <div className="group-data-[collapsible=icon]:hidden">
                    <div className="px-4 py-3 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-primary/60">Current Tier</p>
                            <p className="text-sm font-black text-foreground">Professional</p>
                        </div>
                        <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-black text-[10px]">
                            PRO
                        </div>
                    </div>
                </div>

                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-14 rounded-2xl border border-transparent hover:border-border/50 transition-all duration-300"
                                >
                                    <Avatar className="h-9 w-9 rounded-xl border-2 border-primary/20">
                                        <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email || ""} />
                                        <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold">
                                            {user?.email?.charAt(0).toUpperCase() || "S"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                        <span className="truncate font-black text-foreground">
                                            {user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Strategist"}
                                        </span>
                                        <span className="truncate text-xs text-muted-foreground font-medium">
                                            {user?.email || "syncing intelligence..."}
                                        </span>
                                    </div>
                                    <MoreHorizontal className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-2xl p-2 shadow-2xl border-border/50 backdrop-blur-xl"
                                side={isMobile ? "bottom" : "right"}
                                align="end"
                                sideOffset={4}
                            >
                                <DropdownMenuItem className="rounded-xl py-2 font-bold cursor-pointer" onClick={() => router.push("/dashboard/profile")}>
                                    <User className="mr-2 size-4" />
                                    Profile Configuration
                                </DropdownMenuItem>
                                <DropdownMenuItem className="rounded-xl py-2 font-bold cursor-pointer" onClick={() => router.push("/dashboard/settings")}>
                                    <Settings className="mr-2 size-4" />
                                    System Settings
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="rounded-xl py-2 font-bold text-destructive focus:text-destructive cursor-pointer"
                                    onClick={handleSignOut}
                                >
                                    <LogOut className="mr-2 size-4" />
                                    Terminate Session
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}

function LogOut({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
        </svg>
    );
}
