'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { riskService, countermeasureService, riskObjectService, userService } from '@/lib/api-services';
import type { Risk, User } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Clock, AlertTriangle, CheckCircle, FileText, TrendingUp, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CountermeasureFormDialog } from '@/components/countermeasure/CountermeasureFormDialog';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/language-context';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useQuery as useReactQuery } from '@tanstack/react-query';

const statusColors = {
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
} as const;

const levelColors = {
  LOW: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
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
  const { t } = useLanguage();
  const params = useParams();
  const riskId = params.id as string;
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

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
  const users: User[] = usersData || [];
  const riskTarget = risk ? objects.find((o: any) => o.id === risk.target_id) : null;
  const riskOwner = risk ? users.find((u: User) => u.id === risk.owner_id) : null;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => riskService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      queryClient.invalidateQueries({ queryKey: ['risk', riskId] });
      toast.success(t.risk.riskUpdated);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    },
  });

  const copyId = () => {
    navigator.clipboard.writeText(riskId);
    setCopied(true);
    toast.success(t.common.copiedToClipboard);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.common.loading}</h1>
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
        <p className="text-gray-600 dark:text-gray-400 mb-4">{t.risk.riskNotFound}</p>
        <Button onClick={() => refetch()}>{t.common.retry}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{risk.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{t.risk.idLabel}: {riskId}</span>
            <button
              onClick={copyId}
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-pink-500 transition-colors"
              title={t.common.copy}
            >
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              {copied ? t.common.copied : t.common.copy}
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">{t.risk.created}: {new Date(risk.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={cn('capitalize', statusColors[risk.status as keyof typeof statusColors] || '')}>
            {risk.status === 'IN_PROGRESS' ? t.risk.inProgress : t.risk.completed}
          </Badge>
          {risk.status === 'IN_PROGRESS' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm(t.risk.closeRisk + '?')) {
                  statusMutation.mutate({ id: riskId, status: 'COMPLETED' });
                }
              }}
              disabled={statusMutation.isPending}
              className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950"
            >
              {statusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              <span className="ml-1">{t.risk.closeRisk}</span>
            </Button>
          )}
          {risk.status === 'COMPLETED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm(t.risk.reopenRisk + '?')) {
                  statusMutation.mutate({ id: riskId, status: 'IN_PROGRESS' });
                }
              }}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              <span className="ml-1">{t.risk.reopenRisk}</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <Loader2 className="h-4 w-4 mr-2" />
            {t.risk.refresh}
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
              {t.risk.overview}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t.risk.riskObject}</label>
              <p className="text-gray-900 dark:text-white">{riskTarget?.name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t.risk.riskOwner}</label>
              <p className="text-gray-900 dark:text-white">{riskOwner?.full_name || 'N/A'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t.risk.probability}</label>
                <Badge className={cn(levelColors[risk.probability as keyof typeof levelColors] || '', 'mt-1')}>{risk.probability}</Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t.risk.impact}</label>
                <Badge className={cn(levelColors[risk.impact as keyof typeof levelColors] || '', 'mt-1')}>{risk.impact}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t.risk.maxCauseProbability}</label>
                <Badge className={cn(levelColors[risk.max_cause_probability as keyof typeof levelColors] || '', 'mt-1')}>{risk.max_cause_probability || 'N/A'}</Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t.risk.maxConsequenceProbability}</label>
                <Badge className={cn(levelColors[risk.max_consequence_probability as keyof typeof levelColors] || '', 'mt-1')}>{risk.max_consequence_probability || 'N/A'}</Badge>
              </div>
            </div>
            {risk.financial_loss && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t.risk.financialLoss}</label>
                <p className="text-gray-900 dark:text-white font-mono">{risk.financial_loss}</p>
              </div>
            )}
            {risk.reputational_loss && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t.risk.reputationalLoss}</label>
                <Badge className={cn(levelColors[risk.reputational_loss as keyof typeof levelColors] || '')}>{risk.reputational_loss}</Badge>
              </div>
            )}
            {risk.legal_consequences && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t.risk.legalConsequences}</label>
                <p className="text-gray-900 dark:text-white">{risk.legal_consequences}/5</p>
              </div>
            )}
            {risk.comment && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t.risk.comment}</label>
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
              {t.risk.causes} ({risk.causes?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-hidden">
            {risk.causes?.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t.risk.noCauses}</p>
            ) : (
              <div className="space-y-3">
                {risk.causes?.map((cause) => (
                  <div key={cause.id} className="p-3 border border-border rounded-lg min-w-0">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{cause.name}</p>
                        {cause.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{cause.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="secondary" className={cn(levelColors[cause.probability as keyof typeof levelColors] || '')}>
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
              {t.risk.consequences} ({risk.consequences?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-hidden">
            {risk.consequences?.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t.risk.noConsequences}</p>
            ) : (
              <div className="space-y-3">
                {risk.consequences?.map((consequence) => (
                  <div key={consequence.id} className="p-3 border border-border rounded-lg min-w-0">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{consequence.name}</p>
                        {consequence.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{consequence.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="secondary" className={cn(levelColors[consequence.probability as keyof typeof levelColors] || '')}>
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t.risk.countermeasures}</h2>
        <CountermeasuresSection riskId={riskId} riskStatus={risk.status} />
      </div>
    </div>
  );
}

function CountermeasuresSection({ riskId, riskStatus }: { riskId: string; riskStatus: string }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['countermeasures', riskId],
    queryFn: () => countermeasureService.listByRiskId(riskId).then(res => res.data),
    enabled: !!riskId,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.list().then(res => res.data),
  });

  const users: User[] = usersData || [];

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || userId;
  };

  const countermeasures = data || [];
  const isRiskCompleted = riskStatus === 'COMPLETED';

  const deleteMutation = useMutation({
    mutationFn: (id: string) => countermeasureService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countermeasures', riskId] });
      toast.success(t.risk.countermeasureDeleted);
    },
    onError: () => {
      toast.error(t.common.error);
    },
  });

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
          <p className="text-gray-500 dark:text-gray-400">{t.risk.noCountermeasures}</p>
        </CardContent>
      </Card>
    );
  }

  const causesCMs = countermeasures.filter(cm => cm.target_type === 'CAUSE');
  const consequencesCMs = countermeasures.filter(cm => cm.target_type === 'CONSEQUENCE');

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {causesCMs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              {t.risk.forCauses} ({causesCMs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CountermeasuresList items={causesCMs} isRiskCompleted={isRiskCompleted} riskId={riskId} getUserName={getUserName} deleteMutation={deleteMutation} />
          </CardContent>
        </Card>
      )}

      {consequencesCMs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-600" />
              {t.risk.forConsequences} ({consequencesCMs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CountermeasuresList items={consequencesCMs} isRiskCompleted={isRiskCompleted} riskId={riskId} getUserName={getUserName} deleteMutation={deleteMutation} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CountermeasuresList({ items, isRiskCompleted, riskId, getUserName, deleteMutation }: { 
  items: any[]; 
  isRiskCompleted: boolean; 
  riskId: string; 
  getUserName: (id: string) => string;
  deleteMutation: any;
}) {
  const { t } = useLanguage();
  const [editingCm, setEditingCm] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ description: '', assignee_id: '', deadline: '' });
  const queryClient = useQueryClient();

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.list().then(res => res.data),
  });

  const users: User[] = usersData || [];
  const now = new Date();
  const soonThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { description: string; assignee_id: string; deadline: string } }) =>
      countermeasureService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countermeasures', riskId] });
      toast.success(t.risk.countermeasureUpdated);
      setEditingCm(null);
    },
    onError: () => {
      toast.error(t.common.error);
    },
  });

  const startEdit = (cm: any) => {
    setEditingCm(cm.id);
    setEditForm({
      description: cm.description,
      assignee_id: cm.assignee_id,
      deadline: cm.deadline ? cm.deadline.split('T')[0] : '',
    });
  };

  const saveEdit = (id: string) => {
    if (!editForm.description || !editForm.assignee_id || !editForm.deadline) {
      toast.error(t.common.error);
      return;
    }
    updateMutation.mutate({
      id,
      data: {
        description: editForm.description,
        assignee_id: editForm.assignee_id,
        deadline: editForm.deadline,
      },
    });
  };

  return (
    <div className="space-y-3">
      {items.map((cm) => {
        const deadline = new Date(cm.deadline);
        const isExpired = deadline < now;
        const isExpiringSoon = deadline >= now && deadline <= soonThreshold;
        
        let badgeColor = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
        if (isExpired) badgeColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
        else if (isExpiringSoon) badgeColor = 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';

        if (editingCm === cm.id) {
          return (
            <div key={cm.id} className="p-4 border border-pink-200 rounded-lg bg-pink-50/50 space-y-3">
              <div>
                <Label className="text-xs text-gray-600">{t.risk.countermeasureDescription}</Label>
                <Textarea
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="bg-white/60 border-pink-200 text-gray-900 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600">{t.risk.countermeasureAssignee}</Label>
                  <Select value={editForm.assignee_id} onValueChange={v => setEditForm(f => ({ ...f, assignee_id: v }))}>
                    <SelectTrigger className="h-8 text-xs bg-white/60 border-pink-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u: User) => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">{t.risk.countermeasureDeadline}</Label>
                  <Input
                    type="date"
                    value={editForm.deadline}
                    onChange={e => setEditForm(f => ({ ...f, deadline: e.target.value }))}
                    className="h-8 text-xs bg-white/60 border-pink-200"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setEditingCm(null)} className="text-gray-600 text-xs">{t.common.cancel}</Button>
                <Button size="sm" onClick={() => saveEdit(cm.id)} disabled={updateMutation.isPending} className="bg-pink-500 hover:bg-pink-600 text-white text-xs">
                  {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : t.common.save}
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div key={cm.id} className="p-4 border border-border rounded-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white">{cm.description}</p>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>{t.risk.assignee}: {getUserName(cm.assignee_id)}</span>
                  <Badge className={badgeColor}>
                    {isExpired ? t.risk.expired : isExpiringSoon ? t.risk.expiringSoon : t.risk.active}
                  </Badge>
                  <span>{t.risk.created}: {deadline.toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => startEdit(cm)} className="text-pink-600 hover:text-pink-700 hover:bg-pink-50 text-xs">{t.common.edit}</Button>
                {!isRiskCompleted && (
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs" onClick={() => {
                    if (confirm(t.risk.confirmDeleteCountermeasure)) {
                      deleteMutation.mutate(cm.id);
                    }
                  }}>
                    {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : t.common.delete}
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
