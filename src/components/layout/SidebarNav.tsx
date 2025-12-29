
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from '@/components/ui/sidebar';
import { useNavigationLoading } from '@/components/providers/navigation-loading-provider';

interface SidebarNavProps {
  navItems: NavItem[];
  groupLabel?: string;
}

export function SidebarNav({ navItems, groupLabel }: SidebarNavProps) {
  const pathname = usePathname();
  const { state: sidebarState, isMobile, setOpenMobile } = useSidebar();
  const { startLoading } = useNavigationLoading();

  if (!navItems?.length) {
    return null;
  }

  const handleNavClick = (item: NavItem) => {
    if (!item.disabled && item.href !== pathname) {
      startLoading();
    }
    if (isMobile && !item.disabled) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarGroup className="px-2 py-0">
      {groupLabel && (
        <SidebarGroupLabel className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-3 group-data-[collapsible=icon]:hidden">
          {groupLabel}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <SidebarMenuItem key={index}>
                <Link
                  href={item.disabled ? '#' : item.href}
                  onClick={() => handleNavClick(item)}
                  className="w-full"
                >
                  <SidebarMenuButton
                    isActive={isActive}
                    disabled={item.disabled}
                    aria-disabled={item.disabled}
                    tooltip={sidebarState === 'collapsed' ? item.title : undefined}
                    className={cn(
                      "h-10 px-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
                      isActive
                        ? "bg-primary/10 text-primary font-black shadow-sm"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground font-bold"
                    )}
                  >
                    <item.icon
                      aria-hidden="true"
                      className={cn(
                        "size-4.5 transition-transform duration-300 group-hover:scale-110 flex-shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground"
                      )}
                    />
                    <span className="text-sm tracking-tight truncate group-data-[collapsible=icon]:hidden">
                      {item.title}
                    </span>
                    {isActive && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-l-full group-data-[collapsible=icon]:hidden" />
                    )}
                    {item.label && (
                      <span className={cn(
                        "ml-auto text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter group-data-[collapsible=icon]:hidden flex-shrink-0",
                        isActive
                          ? "bg-primary/20 text-primary"
                          : "bg-secondary text-muted-foreground"
                      )}>
                        {item.label}
                      </span>
                    )}
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

