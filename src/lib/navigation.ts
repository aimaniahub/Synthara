import type { LucideIcon } from 'lucide-react';
import { Home, DatabaseZap, BarChartBig, History, UserCircle, Settings, HelpCircle, FileText, LogIn, LogOut } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  label?: string;
  disabled?: boolean;
  isChangelog?: boolean;
  external?: boolean;
  subItems?: NavItem[];
}

export const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: Home },
  { title: 'Data Generation', href: '/dashboard/generate', icon: DatabaseZap },
  { title: 'Data Preview', href: '/dashboard/preview', icon: FileText, label: 'New' },
  { title: 'Data Analysis', href: '/dashboard/analysis', icon: BarChartBig },
];

export const userNavItems: NavItem[] = [
  { title: 'History', href: '/dashboard/history', icon: History },
  { title: 'Profile', href: '/dashboard/profile', icon: UserCircle },
  { title: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export const helpNavItems: NavItem[] = [
  { title: 'Help & Support', href: '/help', icon: HelpCircle },
  // Example for conditional items, though typically handled in component logic
  // { title: 'Sign Out', href: '#', icon: LogOut, action: 'signOut' }
];
