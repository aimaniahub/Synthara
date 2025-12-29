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

export function StatsCard({ title, value, icon: Icon, trend, color = 'blue' }: StatsCardProps) {
  const colorMap = {
    blue: 'text-blue-500 bg-blue-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    orange: 'text-orange-500 bg-orange-500/10',
    red: 'text-red-500 bg-red-500/10',
  };

  return (
    <Card className="modern-card relative overflow-hidden group">
      {/* Decorative Glow */}
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity ${colorMap[color].split(' ')[1]}`} />

      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl ${colorMap[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          {trend && (
            <div className={`text-sm font-bold flex items-center gap-1 ${trend.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <div className="space-y-1">
          <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
            {title}
          </CardTitle>
          <div className="text-3xl font-black text-foreground tracking-tight">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
