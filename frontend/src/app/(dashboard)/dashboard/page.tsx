'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/hooks/useAuth';
import { reportService } from '@/lib/api-services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">&nbsp;</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-8 w-24 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => reportService.summary().then(res => res.data),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">{t.common.error} {t.report.summary}</p>
        <Button onClick={() => refetch()}>
          {t.common.retry}
        </Button>
      </div>
    );
  }

  const summary = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-foreground">{t.dashboard.title}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Overview of your risk management status</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          aria-label="Refresh data"
        >
          <Loader2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t.report.totalRisks}
          value={summary?.total_risks || 0}
          icon={FileText}
          color="bg-blue-500"
          trend={`${summary?.in_progress_risks || 0} ${t.report.inProgress.toLowerCase()}`}
          loading={isLoading}
        />
        <StatCard
          title={t.report.inProgress}
          value={summary?.in_progress_risks || 0}
          icon={Clock}
          color="bg-yellow-500"
          trend={`${summary?.completed_risks || 0} ${t.report.completed.toLowerCase()}`}
          loading={isLoading}
        />
        <StatCard
          title="Expired Countermeasures"
          value={summary?.expired_countermeasures || 0}
          icon={AlertTriangle}
          color="bg-red-500"
          trend="Require immediate attention"
          loading={isLoading}
        />
        <StatCard
          title={t.report.expiringSoon}
          value={summary?.expiring_soon_countermeasures || 0}
          icon={TrendingUp}
          color="bg-orange-500"
          trend="Plan actions now"
          loading={isLoading}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/risks"
          className="card-hover"
        >
          <Card className="h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t.nav.risks}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">View and manage risks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link
          href="/reports"
          className="card-hover"
        >
          <Card className="h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t.nav.reports}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Detailed analytics & export</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {isAdmin && (
          <Link
            href="/admin/users"
            className="card-hover"
          >
            <Card className="h-full">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{t.nav.admin}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage users & settings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.report.recentActivity}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            Recent activity will be displayed here once audit logs are available
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
