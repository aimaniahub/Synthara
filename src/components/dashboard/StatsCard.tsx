import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'emerald' | 'purple' | 'orange' | 'red';
}

export function StatsCard({ title, value, icon: Icon, trend }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-md">
            <Icon className="h-6 w-6 text-foreground" />
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-foreground">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            {trend && (
              <div className="text-sm text-muted-foreground">
                {trend.isPositive ? '+' : ''}{Math.abs(trend.value)}%
              </div>
            )}
          </div>
        </div>
        <CardTitle className="text-sm font-medium mt-2 text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
