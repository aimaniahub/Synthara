import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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

// Colors are ignored for minimalist monochrome UI
const colorClasses = {
  blue: { iconBg: 'bg-muted', iconColor: 'text-foreground', button: '' },
  emerald: { iconBg: 'bg-muted', iconColor: 'text-foreground', button: '' },
  purple: { iconBg: 'bg-muted', iconColor: 'text-foreground', button: '' },
  orange: { iconBg: 'bg-muted', iconColor: 'text-foreground', button: '' },
};

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Quick Actions</h2>
        <p className="text-sm text-muted-foreground">Common tasks</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {actions.map((action) => {
          const colors = colorClasses[action.color || 'blue'];
          
          return (
            <Card key={action.title} className="border rounded-lg bg-background">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-md ${colors.iconBg}`}>
                    <action.Icon className={`h-6 w-6 ${colors.iconColor}`} />
                  </div>
                </div>
                <CardTitle className="text-foreground text-base font-semibold">
                  {action.title}
                </CardTitle>
                <CardDescription className="text-muted-foreground text-sm">
                  {action.description}
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-0">
                <Button asChild variant="outline" className="w-full">
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
