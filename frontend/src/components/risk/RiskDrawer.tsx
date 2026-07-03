'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, AlertTriangle, TrendingUp, Clock, FileText } from 'lucide-react';
import { riskService } from '@/lib/api-services';
import { riskObjectService } from '@/lib/api-services';
import { userService } from '@/lib/api-services';
import type { Risk, RiskObject, User } from '@/types/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RiskEditSheetProps {
  riskId: string | null;
  onClose: () => void;
}

export function RiskEditSheet({ riskId, onClose }: RiskEditSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [causeCount, setCauseCount] = useState(1);
  const [consequenceCount, setConsequenceCount] = useState(1);
  const queryClient = useQueryClient();

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
      toast.success('Risk updated successfully');
      onClose();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update risk');
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => riskService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      queryClient.invalidateQueries({ queryKey: ['risk', riskId] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Risk status updated');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    },
  });

  useEffect(() => {
    if (risk) {
      setCauseCount(Math.max(1, (risk.causes?.length || 0) + 1));
      setConsequenceCount(Math.max(1, (risk.consequences?.length || 0) + 1));
    }
  }, [risk]);

  if (!riskId) return null;

  if (riskLoading) {
    return (
      <Sheet open={true} onOpenChange={onClose}>
        <SheetContent side="right" className="max-w-2xl">
          <SheetHeader>
            <SheetTitle>Loading...</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 p-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (riskError || !risk) {
    return (
      <Sheet open={true} onOpenChange={onClose}>
        <SheetContent side="right" className="max-w-md">
          <SheetHeader>
            <SheetTitle>Error</SheetTitle>
          </SheetHeader>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">Failed to load risk</p>
            <Button onClick={() => refetch()}>Retry</Button>
            <Button variant="outline" onClick={onClose} className="ml-2">Close</Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
  const legalLevels = [1, 2, 3, 4, 5];

  const getProbabilityColor = (level?: string) => {
    switch (level) {
      case 'LOW': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'HIGH': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'CRITICAL': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const statusColors = {
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
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
    updateMutation.mutate({ id: riskId, data });
  };

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent side="right" className="max-w-2xl overflow-y-auto">
        <SheetHeader className="flex flex-row items-start justify-between pr-10">
          <div>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              {risk.title}
            </SheetTitle>
            <SheetDescription>Quick edit mode - changes save immediately</SheetDescription>
          </div>
        </SheetHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 px-4">
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input id="title" name="title" defaultValue={risk.title} required disabled={isLoading} />
              </div>
              <div>
                <Label htmlFor="target_id">Risk Object *</Label>
                <Select name="target_id" defaultValue={risk.target_id} required disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {objectsData?.map((obj: RiskObject) => (
                      <SelectItem key={obj.id} value={obj.id}>{obj.name} ({obj.object_type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <Label htmlFor="owner_id">Owner *</Label>
                <Select name="owner_id" defaultValue={risk.owner_id} required disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {usersData?.map((user: User) => (
                      <SelectItem key={user.id} value={user.id}>{user.full_name} ({user.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="probability">Probability *</Label>
                <Select name="probability" defaultValue={risk.probability} required disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {riskLevels.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <Label htmlFor="impact">Impact *</Label>
                <Select name="impact" defaultValue={risk.impact} required disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {riskLevels.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reputational_loss">Reputational Loss</Label>
                <Select name="reputational_loss" defaultValue={risk.reputational_loss || ''} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {riskLevels.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <Label htmlFor="financial_loss">Financial Loss</Label>
                <Input id="financial_loss" name="financial_loss" defaultValue={risk.financial_loss || ''} placeholder="e.g., 50000 USD" disabled={isLoading} />
              </div>
              <div>
                <Label htmlFor="legal_consequences">Legal Consequences (1-5)</Label>
                <Select name="legal_consequences" defaultValue={risk.legal_consequences?.toString() || ''} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {legalLevels.map(level => (
                      <SelectItem key={level} value={level.toString()}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="comment">Comment</Label>
              <Textarea id="comment" name="comment" defaultValue={risk.comment || ''} rows={3} placeholder="Additional notes..." disabled={isLoading} />
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <Badge variant="secondary" className={cn('capitalize', statusColors[risk.status as keyof typeof statusColors] || '')}>
                {risk.status.replace('_', ' ')}
              </Badge>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const newStatus = risk.status === 'IN_PROGRESS' ? 'COMPLETED' : 'IN_PROGRESS';
                  if (confirm(`Change status to ${newStatus.replace('_', ' ')}?`)) {
                    statusMutation.mutate({ id: riskId, status: newStatus });
                  }
                }}
                disabled={statusMutation.isPending}
                className={risk.status === 'COMPLETED' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}
              >
                {statusMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  risk.status === 'COMPLETED' ? 'Reopen Risk' : 'Complete Risk'
                )}
              </Button>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Causes ({risk.causes?.length || 0})
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={() => setCauseCount(c => c + 1)}>
                  + Add Cause
                </Button>
              </div>
              <div className="space-y-3" id="causes-container">
                {risk.causes?.map((cause) => (
                  <div key={cause.id} className="grid gap-2 md:grid-cols-[1fr_1fr_200px_auto] items-start">
                    <Input 
                      name="cause_name[]" 
                      defaultValue={cause.name} 
                      placeholder="Cause name *"
                      required
                    />
                    <Input 
                      name="cause_description[]" 
                      defaultValue={cause.description || ''} 
                      placeholder="Description (optional)" 
                    />
                    <Select name="cause_probability[]" defaultValue={cause.probability} required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {riskLevels.map(level => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => {
                      riskService.deleteCause(riskId!, cause.id).then(() => {
                        toast.success('Cause deleted');
                        queryClient.invalidateQueries({ queryKey: ['risk', riskId] });
                        queryClient.invalidateQueries({ queryKey: ['risks'] });
                      }).catch(() => toast.error('Failed to delete cause'));
                    }}>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </Button>
                  </div>
                ))}
                {[...Array(Math.max(0, causeCount - (risk.causes?.length || 0)))].map((_, i) => (
                  <div key={`new-cause-${i}`} className="grid gap-2 md:grid-cols-[1fr_1fr_200px_auto] items-start">
                    <Input 
                      name="cause_name[]" 
                      placeholder="Cause name *" 
                      required
                    />
                    <Input 
                      name="cause_description[]" 
                      placeholder="Description (optional)" 
                    />
                    <Select name="cause_probability[]" required defaultValue="MEDIUM">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {riskLevels.map(level => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => setCauseCount(c => Math.max(1, c - 1))}>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-red-600" />
                  Consequences ({risk.consequences?.length || 0})
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={() => setConsequenceCount(c => c + 1)}>
                  + Add Consequence
                </Button>
              </div>
              <div className="space-y-3" id="consequences-container">
                {risk.consequences?.map((consequence) => (
                  <div key={consequence.id} className="grid gap-2 md:grid-cols-[1fr_1fr_200px_auto] items-start">
                    <Input 
                      name="consequence_name[]" 
                      defaultValue={consequence.name} 
                      placeholder="Consequence name *"
                      required
                    />
                    <Input 
                      name="consequence_description[]" 
                      defaultValue={consequence.description || ''} 
                      placeholder="Description (optional)" 
                    />
                    <Select name="consequence_probability[]" defaultValue={consequence.probability} required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {riskLevels.map(level => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => {
                      riskService.deleteConsequence(riskId!, consequence.id).then(() => {
                        toast.success('Consequence deleted');
                        queryClient.invalidateQueries({ queryKey: ['risk', riskId] });
                        queryClient.invalidateQueries({ queryKey: ['risks'] });
                      }).catch(() => toast.error('Failed to delete consequence'));
                    }}>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </Button>
                  </div>
                ))}
                {[...Array(Math.max(0, consequenceCount - (risk.consequences?.length || 0)))].map((_, i) => (
                  <div key={`new-consequence-${i}`} className="grid gap-2 md:grid-cols-[1fr_1fr_200px_auto] items-start">
                    <Input 
                      name="consequence_name[]" 
                      placeholder="Consequence name *" 
                      required
                    />
                    <Input 
                      name="consequence_description[]" 
                      placeholder="Description (optional)" 
                    />
                    <Select name="consequence_probability[]" required defaultValue="MEDIUM">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {riskLevels.map(level => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => setConsequenceCount(c => Math.max(1, c - 1))}>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <SheetFooter className="border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>Close</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
