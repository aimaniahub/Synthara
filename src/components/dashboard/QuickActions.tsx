"use client";

import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, PlusCircle, Clock, Brain, BarChart, Globe, LucideIcon } from "lucide-react";
import { NavButton } from "@/components/ui/nav-button";

// Define quick actions inside the client component to avoid passing functions from server
const quickActions = [
  { title: "Generate New Dataset", iconName: "PlusCircle", href: "/dashboard/generate", description: "Start generating a new synthetic dataset.", cta: "Generate Data", color: 'blue' as const },
  { title: "View Activity History", iconName: "Clock", href: "/dashboard/history", description: "Review your past activities and logs.", cta: "View History", color: 'emerald' as const },
  { title: "Train New Model", iconName: "Brain", href: "/dashboard/train", description: "Train a machine learning model with your data.", cta: "Train Model", color: 'purple' as const },
  { title: "Analyze Dataset", iconName: "BarChart", href: "/dashboard/analysis", description: "Explore insights from your datasets with AI.", cta: "Analyze Data", color: 'orange' as const },
  { title: "Browse Dataset Market", iconName: "Globe", href: "/dashboard/market", description: "Discover public datasets shared by the community.", cta: "Open Market", color: 'blue' as const },
];

// Icon mapping - icons are defined in client component
const iconMap: Record<string, LucideIcon> = {
  PlusCircle,
  Clock,
  Brain,
  BarChart,
  Globe,
};

// Colors for minimalist monochrome UI
const colorClasses = {
  blue: { iconBg: 'bg-muted', iconColor: 'text-foreground' },
  emerald: { iconBg: 'bg-muted', iconColor: 'text-foreground' },
  purple: { iconBg: 'bg-muted', iconColor: 'text-foreground' },
  orange: { iconBg: 'bg-muted', iconColor: 'text-foreground' },
};

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 gap-2.5">
      {quickActions.map((action) => {
        const IconComponent = iconMap[action.iconName];

        return (
          <NavButton
            key={action.title}
            href={action.href}
            variant="ghost"
            className="modern-card hover:bg-secondary/50 p-3 h-auto justify-start gap-4 group transition-all duration-300 border-transparent hover:border-border"
          >
            <div className="p-2 rounded-lg bg-secondary/50 text-foreground group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300">
              <IconComponent className="size-4" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-bold text-foreground tracking-tight truncate">{action.title}</p>
              <p className="text-[10px] text-muted-foreground font-medium truncate opacity-70 group-hover:opacity-100 transition-opacity">
                {action.description}
              </p>
            </div>
            <ArrowRight className="size-3.5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </NavButton>
        );
      })}
    </div>
  );
}
