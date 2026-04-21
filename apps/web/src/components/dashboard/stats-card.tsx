import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  description?: string;
  trend?: {
    value: number;
    label: string;
  };
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
}

export function StatsCard({
  title,
  value,
  description,
  trend,
  icon: Icon,
  iconColor = 'text-primary',
}: StatsCardProps) {
  const TrendIcon =
    trend && trend.value > 0
      ? TrendingUp
      : trend && trend.value < 0
        ? TrendingDown
        : Minus;

  const trendColor =
    trend && trend.value > 0
      ? 'text-emerald-600'
      : trend && trend.value < 0
        ? 'text-red-600'
        : 'text-muted-foreground';

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10',
              iconColor === 'text-primary' ? 'bg-primary/10' : ''
            )}
          >
            <Icon className={cn('h-6 w-6', iconColor)} />
          </div>
        </div>
        {(trend || description) && (
          <div className="mt-3 flex items-center gap-2">
            {trend && (
              <>
                <TrendIcon className={cn('h-4 w-4', trendColor)} />
                <span className={cn('text-sm font-medium', trendColor)}>
                  {trend.value > 0 ? '+' : ''}
                  {trend.value}%
                </span>
              </>
            )}
            {description && (
              <span className="text-sm text-muted-foreground">
                {description}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
