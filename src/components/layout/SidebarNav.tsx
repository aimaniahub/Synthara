
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
    <SidebarGroup>
      {groupLabel && <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {navItems.map((item, index) => (
            <SidebarMenuItem key={index}>
              <Link href={item.disabled ? '#' : item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                  disabled={item.disabled}
                  aria-disabled={item.disabled}
                  tooltip={sidebarState === 'collapsed' ? item.title : undefined}
                >
                  <item.icon aria-hidden="true" />
                  <span>{item.title}</span>
                  {item.label && (
                    <span className={cn(
                      "ml-auto text-xs px-2 py-0.5 rounded-full",
                      pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)) 
                        ? "bg-primary-foreground text-primary" 
                        : "bg-accent text-accent-foreground"
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
