'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { riskService } from '@/lib/api-services';
import { riskObjectService } from '@/lib/api-services';
import { userService } from '@/lib/api-services';
import type { RiskObject, User } from '@/types/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface CreateRiskDialogProps {
  onSuccess?: () => void;
}

export function CreateRiskDialog({ onSuccess }: CreateRiskDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: objectsData } = useQuery({
    queryKey: ['risk-objects'],
    queryFn: () => riskObjectService.list().then(res => res.data),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.list().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: riskService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      toast.success('Risk created successfully');
      setIsOpen(false);
      onSuccess?.();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to create risk';
      toast.error(message);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const legalLevels = [1, 2, 3, 4, 5];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const causes: Array<{ name: string; description?: string; probability: string }> = [];
    const consequences: Array<{ name: string; description?: string; probability: string }> = [];
    
    // Parse dynamic fields (simplified for this version)
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
    createMutation.mutate(data);
  };

  const [causeCount, setCauseCount] = useState(1);
  const [consequenceCount, setConsequenceCount] = useState(1);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2">
            <span>+ Create Risk</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Risk</DialogTitle>
            <DialogDescription>Fill in the details to create a new risk assessment</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input id="title" name="title" required placeholder="Enter risk title" />
                </div>
                <div>
                  <Label htmlFor="target_id">Risk Object *</Label>
                  <Select name="target_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select risk object" />
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
                  <Select name="owner_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select owner" />
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
                  <Select name="probability" required defaultValue="MEDIUM">
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
                  <Select name="impact" required defaultValue="MEDIUM">
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
                  <Select name="reputational_loss">
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
                  <Input id="financial_loss" name="financial_loss" placeholder="e.g., 50000 USD" />
                </div>
                <div>
                  <Label htmlFor="legal_consequences">Legal Consequences (1-5)</Label>
                  <Select name="legal_consequences">
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
                <Textarea id="comment" name="comment" rows={3} placeholder="Additional notes..." />
              </div>

              {/* Causes Section */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-lg">Causes</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCauseCount(c => c + 1)}>
                    + Add Cause
                  </Button>
                </div>
                <div className="space-y-3" id="causes-container">
                  {[...Array(causeCount)].map((_, i) => (
                    <div key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_200px_auto] items-start">
                      <Input 
                        name="cause_name[]" 
                        placeholder="Cause name *" 
                        required={i === 0}
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
                      {causeCount > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => setCauseCount(c => Math.max(1, c - 1))} className="text-red-600 hover:text-red-700">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Consequences Section */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-lg">Consequences</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => setConsequenceCount(c => c + 1)}>
                    + Add Consequence
                  </Button>
                </div>
                <div className="space-y-3" id="consequences-container">
                  {[...Array(consequenceCount)].map((_, i) => (
                    <div key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_200px_auto] items-start">
                      <Input 
                        name="consequence_name[]" 
                        placeholder="Consequence name *" 
                        required={i === 0}
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
                      {consequenceCount > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => setConsequenceCount(c => Math.max(1, c - 1))} className="text-red-600 hover:text-red-700">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Risk'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}