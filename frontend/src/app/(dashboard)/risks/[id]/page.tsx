'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { riskService, countermeasureService, riskObjectService, userService } from '@/lib/api-services';
import type { Risk } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Clock, AlertTriangle, CheckCircle, FileText, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CountermeasureFormDialog } from '@/components/countermeasure/CountermeasureFormDialog';

const statusColors = {
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
} as const;

function RiskCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <Skeleton className="h-6 w-1/4" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RiskDetailPage() {
  const params = useParams();
  const riskId = params.id as string;
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['risk', riskId],
    queryFn: () => riskService.get(riskId).then(res => res.data),
    enabled: !!riskId,
  });

  const { data: objectsData } = useQuery({
    queryKey: ['risk-objects'],
    queryFn: () => riskObjectService.list().then(res => res.data),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.list().then(res => res.data),
  });

  const risk = data;
  const objects: any[] = objectsData || [];
  const users: any[] = usersData || [];
  const riskTarget = risk ? objects.find((o: any) => o.id === risk.target_id) : null;
  const riskOwner = risk ? users.find((u: any) => u.id === risk.owner_id) : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Loading...</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <RiskCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !risk) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">Risk not found</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const getProbabilityColor = (level?: string) => {
    switch (level) {
      case 'LOW': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'HIGH': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'CRITICAL': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{risk.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-mono">ID: {risk.id.slice(0, 8)}...</span>
            <span>Created: {new Date(risk.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={cn('capitalize', statusColors[risk.status as keyof typeof statusColors] || '')}>
            {risk.status.replace('_', ' ')}
          </Badge>
          <Button variant="outline" size="sm">
            <Loader2 className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Risk Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Risk Object</label>
              <p className="text-gray-900 dark:text-white">{riskTarget?.name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Owner</label>
              <p className="text-gray-900 dark:text-white">{riskOwner?.full_name || 'N/A'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Probability</label>
                <Badge className={getProbabilityColor(risk.probability)}>{risk.probability}</Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Impact</label>
                <Badge className={getProbabilityColor(risk.impact)}>{risk.impact}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Max Cause Probability</label>
                <Badge className={getProbabilityColor(risk.max_cause_probability)}>{risk.max_cause_probability || 'N/A'}</Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Max Consequence Probability</label>
                <Badge className={getProbabilityColor(risk.max_consequence_probability)}>{risk.max_consequence_probability || 'N/A'}</Badge>
              </div>
            </div>
            {risk.financial_loss && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Financial Loss</label>
                <p className="text-gray-900 dark:text-white font-mono">{risk.financial_loss}</p>
              </div>
            )}
            {risk.reputational_loss && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Reputational Loss</label>
                <Badge className={getProbabilityColor(risk.reputational_loss)}>{risk.reputational_loss}</Badge>
              </div>
            )}
            {risk.legal_consequences && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Legal Consequences</label>
                <p className="text-gray-900 dark:text-white">{risk.legal_consequences}/5</p>
              </div>
            )}
            {risk.comment && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Comment</label>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{risk.comment}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Causes */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Causes ({risk.causes?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {risk.causes?.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No causes defined</p>
            ) : (
              <div className="space-y-3">
                {risk.causes?.map((cause) => (
                  <div key={cause.id} className="p-3 border border-border rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{cause.name}</p>
                        {cause.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{cause.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={getProbabilityColor(cause.probability)}>
                          {cause.probability}
                        </Badge>
                        <CountermeasureFormDialog
                          riskId={riskId}
                          targetType="CAUSE"
                          targetId={cause.id}
                          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['countermeasures', riskId] })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Consequences */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-600" />
              Consequences ({risk.consequences?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {risk.consequences?.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No consequences defined</p>
            ) : (
              <div className="space-y-3">
                {risk.consequences?.map((consequence) => (
                  <div key={consequence.id} className="p-3 border border-border rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{consequence.name}</p>
                        {consequence.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{consequence.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={getProbabilityColor(consequence.probability)}>
                          {consequence.probability}
                        </Badge>
                        <CountermeasureFormDialog
                          riskId={riskId}
                          targetType="CONSEQUENCE"
                          targetId={consequence.id}
                          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['countermeasures', riskId] })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Countermeasures Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Countermeasures</h2>
        <CountermeasuresSection riskId={riskId} riskStatus={risk.status} />
      </div>
    </div>
  );
}

function CountermeasuresSection({ riskId, riskStatus }: { riskId: string; riskStatus: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['countermeasures', riskId],
    queryFn: () => countermeasureService.listByRiskId(riskId).then(res => res.data),
    enabled: !!riskId,
  });

  const countermeasures = data || [];
  const isRiskCompleted = riskStatus === 'COMPLETED';

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (countermeasures.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No countermeasures defined</p>
        </CardContent>
      </Card>
    );
  }

  // Group by target type
  const causesCMs = countermeasures.filter(cm => cm.target_type === 'CAUSE');
  const consequencesCMs = countermeasures.filter(cm => cm.target_type === 'CONSEQUENCE');

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {causesCMs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              For Causes ({causesCMs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CountermeasuresList items={causesCMs} isRiskCompleted={isRiskCompleted} riskId={riskId} />
          </CardContent>
        </Card>
      )}

      {consequencesCMs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-600" />
              For Consequences ({consequencesCMs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CountermeasuresList items={consequencesCMs} isRiskCompleted={isRiskCompleted} riskId={riskId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CountermeasuresList({ items, isRiskCompleted, riskId }: { 
  items: any[]; 
  isRiskCompleted: boolean; 
  riskId: string; 
}) {
  const now = new Date();
  const soonThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return (
    <div className="space-y-3">
      {items.map((cm) => {
        const deadline = new Date(cm.deadline);
        const isExpired = deadline < now;
        const isExpiringSoon = deadline >= now && deadline <= soonThreshold;
        
        let badgeColor = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
        if (isExpired) badgeColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
        else if (isExpiringSoon) badgeColor = 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';

        return (
          <div key={cm.id} className="p-4 border border-border rounded-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white">{cm.description}</p>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>Assignee: {cm.assignee?.full_name || cm.assignee_id}</span>
                  <Badge className={badgeColor}>
                    {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Active'}
                  </Badge>
                  <span>Deadline: {deadline.toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">Edit</Button>
                {!isRiskCompleted && (
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">Delete</Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}