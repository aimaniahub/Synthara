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

const colorClasses = {
  blue: {
    border: 'border-l-blue-500',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  emerald: {
    border: 'border-l-emerald-500',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  purple: {
    border: 'border-l-purple-500',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  orange: {
    border: 'border-l-orange-500',
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
  red: {
    border: 'border-l-red-500',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
  },
};

export function StatsCard({ title, value, icon: Icon, trend, color = 'blue' }: StatsCardProps) {
  const colors = colorClasses[color];

  return (
    <Card className={`modern-card hover:shadow-xl transition-all duration-300 border-l-4 ${colors.border}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className={`p-3 rounded-xl ${colors.iconBg}`}>
            <Icon className={`h-6 w-6 ${colors.iconColor}`} />
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            {trend && (
              <div className={`text-sm font-medium ${
                trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </div>
            )}
          </div>
        </div>
        <CardTitle className="text-slate-700 dark:text-slate-300 text-base font-medium mt-2">
          {title}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
