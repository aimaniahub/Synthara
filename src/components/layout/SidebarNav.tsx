
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

interface SidebarNavProps {
  navItems: NavItem[];
  groupLabel?: string;
}

export function SidebarNav({ navItems, groupLabel }: SidebarNavProps) {
  const pathname = usePathname();
  const { state: sidebarState } = useSidebar();

  if (!navItems?.length) {
    return null;
  }

  return (
    <SidebarGroup className="px-4 sm:px-6 py-3 sm:py-4">
      {groupLabel && (
        <SidebarGroupLabel className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 sm:mb-4 group-data-[collapsible=icon]:hidden">
          {groupLabel}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu className="space-y-1 sm:space-y-2">
          {navItems.map((item, index) => (
            <SidebarMenuItem key={index}>
              <Link href={item.disabled ? '#' : item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                  disabled={item.disabled}
                  aria-disabled={item.disabled}
                  tooltip={sidebarState === 'collapsed' ? item.title : undefined}
                  className="h-11 sm:h-12 px-3 sm:px-4 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all duration-200 group"
                >
                  <item.icon
                    aria-hidden="true"
                    className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-500 transition-colors flex-shrink-0"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 text-sm sm:text-base truncate">
                    {item.title}
                  </span>
                  {item.label && (
                    <span className={cn(
                      "ml-auto text-xs px-2 py-1 rounded-full font-medium group-data-[collapsible=icon]:hidden flex-shrink-0",
                      pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                        ? "bg-primary-foreground text-primary"
                        : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    )}>
                      {item.label}
                    </span>
                  )}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
