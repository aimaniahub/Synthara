
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
  const { state: sidebarState, isMobile, setOpenMobile } = useSidebar();

  if (!navItems?.length) {
    return null;
  }

  return (
    <SidebarGroup className="px-4 sm:px-6 py-3 sm:py-4">
      {groupLabel && (
        <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 sm:mb-4 group-data-[collapsible=icon]:hidden">
          {groupLabel}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu className="space-y-1 sm:space-y-2">
          {navItems.map((item, index) => (
            <SidebarMenuItem key={index}>
              <Link
                href={item.disabled ? '#' : item.href}
                onClick={() => {
                  // Auto-close sidebar on mobile when clicking a nav item
                  if (isMobile && !item.disabled) {
                    setOpenMobile(false);
                  }
                }}
              >
                <SidebarMenuButton
                  isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                  disabled={item.disabled}
                  aria-disabled={item.disabled}
                  tooltip={sidebarState === 'collapsed' ? item.title : undefined}
                  className="h-11 sm:h-12 px-3 sm:px-4 rounded-xl hover:bg-muted transition-all duration-200 group"
                >
                  <item.icon
                    aria-hidden="true"
                    className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0"
                  />
                  <span className="font-medium text-foreground text-sm sm:text-base truncate">
                    {item.title}
                  </span>
                  {item.label && (
                    <span className={cn(
                      "ml-auto text-xs px-2 py-1 rounded-full font-medium group-data-[collapsible=icon]:hidden flex-shrink-0",
                      pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                        ? "bg-muted text-foreground"
                        : "bg-muted text-foreground"
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
