'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, AlertTriangle, TrendingUp, FileText, Trash2 } from 'lucide-react';
import { riskService, riskObjectService, userService } from '@/lib/api-services';
import type { Risk, RiskObject, User } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Autocomplete } from '@/components/ui/Autocomplete';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/language-context';

interface RiskEditSheetProps {
  riskId: string | null;
  onClose: () => void;
}

export function RiskEditSheet({ riskId, onClose }: RiskEditSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [causeCount, setCauseCount] = useState(1);
  const [consequenceCount, setConsequenceCount] = useState(1);
  const [ownerId, setOwnerId] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const { data: risk, isLoading: riskLoading, error: riskError, refetch } = useQuery({
    queryKey: ['risk', riskId],
    queryFn: () => riskService.get(riskId!).then(res => res.data),
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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof riskService.update>[1] }) => riskService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      queryClient.invalidateQueries({ queryKey: ['risk', riskId] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(t.risk.riskUpdated);
      onClose();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update risk');
    },
    onSettled: () => setIsLoading(false),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => riskService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      queryClient.invalidateQueries({ queryKey: ['risk', riskId] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(t.risk.riskUpdated);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    },
  });

  useEffect(() => {
    if (risk) {
      setOwnerId(risk.owner_id);
      setCauseCount(Math.max(1, (risk.causes?.length || 0) + 1));
      setConsequenceCount(Math.max(1, (risk.consequences?.length || 0) + 1));
    }
  }, [risk]);

  const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
  const legalLevels = [1, 2, 3, 4, 5];

  const statusColors = {
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
  } as const;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const causes: Array<{ name: string; description?: string; probability: string }> = [];
    const consequences: Array<{ name: string; description?: string; probability: string }> = [];

    const causeNames = formData.getAll('cause_name[]');
    const causeDescs = formData.getAll('cause_description[]');
    const causeProbs = formData.getAll('cause_probability[]');

    for (let i = 0; i < causeNames.length; i++) {
      if (causeNames[i]) {
        causes.push({
          name: causeNames[i] as string,
          description: causeDescs[i] as string || undefined,
          probability: causeProbs[i] as string,
        });
      }
    }

    const conseqNames = formData.getAll('consequence_name[]');
    const conseqDescs = formData.getAll('consequence_description[]');
    const conseqProbs = formData.getAll('consequence_probability[]');

    for (let i = 0; i < conseqNames.length; i++) {
      if (conseqNames[i]) {
        consequences.push({
          name: conseqNames[i] as string,
          description: conseqDescs[i] as string || undefined,
          probability: conseqProbs[i] as string,
        });
      }
    }

    const data = {
      title: formData.get('title') as string,
      target_id: formData.get('target_id') as string,
      owner_id: formData.get('owner_id') as string,
      probability: formData.get('probability') as string,
      impact: formData.get('impact') as string,
      financial_loss: formData.get('financial_loss') as string || undefined,
      reputational_loss: formData.get('reputational_loss') as string || undefined,
      legal_consequences: formData.get('legal_consequences') ? parseInt(formData.get('legal_consequences') as string) : undefined,
      comment: formData.get('comment') as string || undefined,
      causes,
      consequences,
    };

    setIsLoading(true);
    updateMutation.mutate({ id: riskId!, data });
  };

  if (!riskId) return null;

  if (riskLoading) {
    return (
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div className="absolute bottom-6 right-6 w-[600px] max-h-[calc(100vh-3rem)] pointer-events-auto">
          <div className="bg-pink-50/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-pink-200/60 overflow-hidden">
            <div className="px-6 py-4 border-b border-pink-200/50">
              <div className="h-5 w-40 bg-pink-200/50 animate-pulse rounded" />
            </div>
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-pink-100/50 animate-pulse rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (riskError || !risk) {
    return (
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div className="absolute bottom-6 right-6 w-[600px] max-h-[calc(100vh-3rem)] pointer-events-auto">
          <div className="bg-pink-50/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-pink-200/60 overflow-hidden">
            <div className="px-6 py-4 border-b border-pink-200/50">
              <h3 className="font-semibold text-gray-900 text-sm">{t.common.error}</h3>
            </div>
            <div className="p-6 text-center">
              <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
              <p className="text-gray-600 text-sm mb-4">{t.risk.riskNotFound}</p>
              <div className="flex justify-center gap-2">
                <Button onClick={() => refetch()} size="sm" className="bg-pink-500 hover:bg-pink-600 text-white text-xs">Retry</Button>
                <Button variant="outline" onClick={onClose} size="sm" className="border-pink-200 text-gray-700 hover:bg-pink-100/50 text-xs">{t.common.close}</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        ref={panelRef}
        className="absolute bottom-6 right-6 w-[680px] max-h-[calc(100vh-3rem)] pointer-events-auto transition-all duration-300 ease-out opacity-100 scale-100 translate-y-0"
      >
        <div className="bg-pink-50/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-pink-200/60 overflow-hidden flex flex-col max-h-[calc(100vh-3rem)]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-pink-200/50 bg-gradient-to-r from-pink-200/40 to-transparent shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-pink-300/40 flex items-center justify-center">
                <FileText className="h-4 w-4 text-pink-600" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">{risk.title}</h3>
                <p className="text-xs text-pink-500/70">{t.risk.editRisk}</p>
              </div>
            </div>
            <button onClick={onClose} className="h-7 w-7 rounded-lg hover:bg-pink-300/30 flex items-center justify-center transition-colors">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-hide">
            <form id="risk-edit-form" onSubmit={handleSubmit}>
              <div className="space-y-5">
                {/* Main Info */}
                <div>
                  <p className="text-xs font-medium text-pink-500/70 uppercase tracking-wider mb-3">{t.risk.riskName}</p>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-gray-700 text-xs font-medium">{t.risk.riskName} *</Label>
                      <Input name="title" defaultValue={risk.title} required disabled={isLoading} className="h-9 bg-white/70 border-pink-200 text-gray-900 text-sm focus:border-pink-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-gray-700 text-xs font-medium">{t.risk.riskObject} *</Label>
                        <Select name="target_id" defaultValue={risk.target_id} required disabled={isLoading}>
                          <SelectTrigger className="h-9 bg-white/70 border-pink-200 text-gray-900 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {objectsData?.map((obj: RiskObject) => (
                              <SelectItem key={obj.id} value={obj.id} className="text-sm">{obj.name} ({obj.object_type})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-gray-700 text-xs font-medium">{t.risk.riskOwner} *</Label>
                        <Autocomplete
                          options={(usersData || []).map((u: User) => ({ label: u.full_name, value: u.id, subtitle: u.email }))}
                          value={ownerId}
                          onChange={setOwnerId}
                          placeholder={t.risk.riskOwner}
                          disabled={isLoading}
                          className="bg-white/70 border-pink-200 text-gray-900"
                        />
                        <input type="hidden" name="owner_id" value={ownerId} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assessment */}
                <div>
                  <p className="text-xs font-medium text-pink-500/70 uppercase tracking-wider mb-3">{t.risk.stepRiskAnalysis}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-gray-700 text-xs font-medium">{t.risk.probability} *</Label>
                      <Select name="probability" defaultValue={risk.probability} required disabled={isLoading}>
                        <SelectTrigger className="h-9 bg-white/70 border-pink-200 text-gray-900 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {riskLevels.map(level => (
                            <SelectItem key={level} value={level} className="text-sm">{level}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-700 text-xs font-medium">{t.risk.impact} *</Label>
                      <Select name="impact" defaultValue={risk.impact} required disabled={isLoading}>
                        <SelectTrigger className="h-9 bg-white/70 border-pink-200 text-gray-900 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {riskLevels.map(level => (
                            <SelectItem key={level} value={level} className="text-sm">{level}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Losses */}
                <div>
                  <p className="text-xs font-medium text-pink-500/70 uppercase tracking-wider mb-3">{t.risk.stepImpactAssessment}</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-gray-700 text-xs font-medium">{t.risk.financialLoss}</Label>
                      <Input name="financial_loss" defaultValue={risk.financial_loss || ''} placeholder="50000 USD" disabled={isLoading} className="h-9 bg-white/70 border-pink-200 text-gray-900 placeholder:text-gray-400 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-700 text-xs font-medium">{t.risk.reputationalLoss}</Label>
                      <Select name="reputational_loss" defaultValue={risk.reputational_loss || ''} disabled={isLoading}>
                        <SelectTrigger className="h-9 bg-white/70 border-pink-200 text-gray-900 text-sm">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {riskLevels.map(level => (
                            <SelectItem key={level} value={level} className="text-sm">{level}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-700 text-xs font-medium">{t.risk.legalConsequences}</Label>
                      <Select name="legal_consequences" defaultValue={risk.legal_consequences?.toString() || ''} disabled={isLoading}>
                        <SelectTrigger className="h-9 bg-white/70 border-pink-200 text-gray-900 text-sm">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {legalLevels.map(level => (
                            <SelectItem key={level} value={level.toString()} className="text-sm">{level}/5</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Comment */}
                <div className="space-y-1.5">
                  <Label className="text-gray-700 text-xs font-medium">{t.risk.comment}</Label>
                  <Textarea name="comment" defaultValue={risk.comment || ''} rows={2} disabled={isLoading} className="bg-white/70 border-pink-200 text-gray-900 placeholder:text-gray-400 text-sm" />
                </div>

                {/* Status */}
                <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-pink-100">
                  <Badge variant="secondary" className={cn('capitalize text-xs', statusColors[risk.status as keyof typeof statusColors] || '')}>
                    {risk.status === 'IN_PROGRESS' ? t.risk.inProgress : t.risk.completed}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newStatus = risk.status === 'IN_PROGRESS' ? 'COMPLETED' : 'IN_PROGRESS';
                      if (confirm(`${t.common.confirm} ${newStatus === 'IN_PROGRESS' ? t.risk.reopenRisk : t.risk.closeRisk}?`)) {
                        statusMutation.mutate({ id: riskId, status: newStatus });
                      }
                    }}
                    disabled={statusMutation.isPending}
                    className="border-pink-200 text-gray-700 hover:bg-pink-100/50 text-xs h-7"
                  >
                    {statusMutation.isPending ? (
                      <><Loader2 className="h-3 w-3 animate-spin mr-1" /> {t.common.saving}</>
                    ) : (
                      risk.status === 'COMPLETED' ? t.risk.reopenRisk : t.risk.closeRisk
                    )}
                  </Button>
                </div>

                {/* Causes */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-pink-500/70 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-yellow-600" />
                      {t.risk.causes} ({risk.causes?.length || 0})
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={() => setCauseCount(c => c + 1)} className="border-pink-200 text-gray-700 hover:bg-pink-100/50 text-xs h-7">
                      + {t.risk.addCause}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {risk.causes?.map((cause) => (
                      <div key={cause.id} className="p-3 bg-white/60 rounded-xl border border-pink-100">
                        <input type="hidden" name="cause_id[]" value={cause.id} />
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-2">
                            <div className="grid grid-cols-[1fr_140px] gap-2">
                              <Input name="cause_name[]" defaultValue={cause.name} required className="h-8 text-sm bg-white/70 border-pink-200 text-gray-900" />
                              <Select name="cause_probability[]" defaultValue={cause.probability} required>
                                <SelectTrigger className="h-8 text-sm bg-white/70 border-pink-200 text-gray-900">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {riskLevels.map(level => (
                                    <SelectItem key={level} value={level} className="text-sm">{level}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Input name="cause_description[]" defaultValue={cause.description || ''} placeholder={t.risk.comment} className="h-8 text-sm bg-white/70 border-pink-200 text-gray-900 placeholder:text-gray-400" />
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0 h-8 w-8 mt-0" onClick={() => {
                            riskService.deleteCause(riskId!, cause.id).then(() => {
                              toast.success(t.common.deleted);
                              queryClient.invalidateQueries({ queryKey: ['risk', riskId] });
                              queryClient.invalidateQueries({ queryKey: ['risks'] });
                            }).catch(() => toast.error(t.common.error));
                          }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {[...Array(Math.max(0, causeCount - (risk.causes?.length || 0)))].map((_, i) => (
                      <div key={`new-cause-${i}`} className="p-3 bg-white/60 rounded-xl border border-dashed border-pink-200">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-2">
                            <div className="grid grid-cols-[1fr_140px] gap-2">
                              <Input name="cause_name[]" required placeholder={`${t.risk.addCause} *`} className="h-8 text-sm bg-white/70 border-pink-200 text-gray-900 placeholder:text-gray-400" />
                              <Select name="cause_probability[]" required defaultValue="MEDIUM">
                                <SelectTrigger className="h-8 text-sm bg-white/70 border-pink-200 text-gray-900">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {riskLevels.map(level => (
                                    <SelectItem key={level} value={level} className="text-sm">{level}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Input name="cause_description[]" placeholder={t.risk.comment} className="h-8 text-sm bg-white/70 border-pink-200 text-gray-900 placeholder:text-gray-400" />
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0 h-8 w-8 mt-0" onClick={() => setCauseCount(c => Math.max(1, c - 1))}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Consequences */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-pink-500/70 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="h-3 w-3 text-red-600" />
                      {t.risk.consequences} ({risk.consequences?.length || 0})
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={() => setConsequenceCount(c => c + 1)} className="border-pink-200 text-gray-700 hover:bg-pink-100/50 text-xs h-7">
                      + {t.risk.addConsequence}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {risk.consequences?.map((consequence) => (
                      <div key={consequence.id} className="p-3 bg-white/60 rounded-xl border border-pink-100">
                        <input type="hidden" name="consequence_id[]" value={consequence.id} />
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-2">
                            <div className="grid grid-cols-[1fr_140px] gap-2">
                              <Input name="consequence_name[]" defaultValue={consequence.name} required className="h-8 text-sm bg-white/70 border-pink-200 text-gray-900" />
                              <Select name="consequence_probability[]" defaultValue={consequence.probability} required>
                                <SelectTrigger className="h-8 text-sm bg-white/70 border-pink-200 text-gray-900">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {riskLevels.map(level => (
                                    <SelectItem key={level} value={level} className="text-sm">{level}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Input name="consequence_description[]" defaultValue={consequence.description || ''} placeholder={t.risk.comment} className="h-8 text-sm bg-white/70 border-pink-200 text-gray-900 placeholder:text-gray-400" />
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0 h-8 w-8 mt-0" onClick={() => {
                            riskService.deleteConsequence(riskId!, consequence.id).then(() => {
                              toast.success(t.common.deleted);
                              queryClient.invalidateQueries({ queryKey: ['risk', riskId] });
                              queryClient.invalidateQueries({ queryKey: ['risks'] });
                            }).catch(() => toast.error(t.common.error));
                          }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {[...Array(Math.max(0, consequenceCount - (risk.consequences?.length || 0)))].map((_, i) => (
                      <div key={`new-consequence-${i}`} className="p-3 bg-white/60 rounded-xl border border-dashed border-pink-200">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-2">
                            <div className="grid grid-cols-[1fr_140px] gap-2">
                              <Input name="consequence_name[]" required placeholder={`${t.risk.addConsequence} *`} className="h-8 text-sm bg-white/70 border-pink-200 text-gray-900 placeholder:text-gray-400" />
                              <Select name="consequence_probability[]" required defaultValue="MEDIUM">
                                <SelectTrigger className="h-8 text-sm bg-white/70 border-pink-200 text-gray-900">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {riskLevels.map(level => (
                                    <SelectItem key={level} value={level} className="text-sm">{level}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Input name="consequence_description[]" placeholder={t.risk.comment} className="h-8 text-sm bg-white/70 border-pink-200 text-gray-900 placeholder:text-gray-400" />
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0 h-8 w-8 mt-0" onClick={() => setConsequenceCount(c => Math.max(1, c - 1))}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-pink-200/50 bg-pink-100/20 shrink-0">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs text-gray-500 hover:text-gray-700 hover:bg-pink-100/50">
              {t.common.close}
            </Button>
            <Button type="submit" form="risk-edit-form" disabled={isLoading} size="sm" className="h-8 text-xs bg-pink-500 hover:bg-pink-600 text-white">
              {isLoading ? (
                <><Loader2 className="h-3 w-3 animate-spin mr-1" /> {t.common.saving}</>
              ) : t.common.save}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
