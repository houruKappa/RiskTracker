'use client';

import { FileText, Clock, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: string;
  loading?: boolean;
}

export function StatCard({ title, value, icon: Icon, color, trend, loading }: StatCardProps) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="h-8 w-24 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-8 w-8 animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-3xl font-bold text-gray-900 dark:text-white min-w-0 truncate">
            {value}
          </div>
          <div className={cn('p-2 rounded-full', color)}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
        {trend && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{trend}</p>
        )}
      </CardContent>
    </Card>
  );
}