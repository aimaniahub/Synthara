import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, LucideIcon } from "lucide-react";
import Link from 'next/link';

interface QuickAction {
  title: string;
  description: string;
  href: string;
  cta: string;
  Icon: LucideIcon;
  color?: 'blue' | 'emerald' | 'purple' | 'orange';
}

interface QuickActionsProps {
  actions: QuickAction[];
}

const colorClasses = {
  blue: {
    iconBg: 'bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  emerald: {
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    button: 'bg-emerald-600 hover:bg-emerald-700',
  },
  purple: {
    iconBg: 'bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50',
    iconColor: 'text-purple-600 dark:text-purple-400',
    button: 'bg-purple-600 hover:bg-purple-700',
  },
  orange: {
    iconBg: 'bg-orange-100 dark:bg-orange-900/30 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50',
    iconColor: 'text-orange-600 dark:text-orange-400',
    button: 'bg-orange-600 hover:bg-orange-700',
  },
};

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-headline font-bold text-slate-900 dark:text-slate-100">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {actions.map((action) => {
          const colors = colorClasses[action.color || 'blue'];
          
          return (
            <Card key={action.title} className="modern-card hover:shadow-xl transition-all duration-300 group cursor-pointer">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-xl ${colors.iconBg} transition-colors`}>
                    <action.Icon className={`h-7 w-7 ${colors.iconColor}`} />
                  </div>
                </div>
                <CardTitle className="text-slate-900 dark:text-slate-100 text-lg font-semibold">
                  {action.title}
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  {action.description}
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-0">
                <Button asChild className={`w-full ${colors.button} text-white group-hover:shadow-lg transition-all`}>
                  <Link href={action.href}>
                    {action.cta} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
