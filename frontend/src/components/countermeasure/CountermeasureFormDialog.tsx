'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Autocomplete } from '@/components/ui/Autocomplete';
import { countermeasureService, userService } from '@/lib/api-services';
import type { User } from '@/types/api';
import { toast } from 'sonner';
import { Loader2, Plus, X } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

interface CountermeasureFormDialogProps {
  riskId: string;
  targetType: 'CAUSE' | 'CONSEQUENCE';
  targetId: string;
  onSuccess?: () => void;
}

export function CountermeasureFormDialog({ riskId, targetType, targetId, onSuccess }: CountermeasureFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.list().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      risk_id: string;
      target_type: 'CAUSE' | 'CONSEQUENCE';
      cause_id?: string;
      consequence_id?: string;
      description: string;
      assignee_id: string;
      deadline: string;
    }) => countermeasureService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countermeasures'] });
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      toast.success(t.risk.countermeasureCreated);
      setDescription('');
      setAssigneeId('');
      setDeadline('');
      setIsOpen(false);
      onSuccess?.();
    },
    onError: (error: unknown) => {
      console.error('Countermeasure create error:', error);
      const axiosError = error as { response?: { data?: { error?: string } } };
      const msg = axiosError?.response?.data?.error || (error instanceof Error ? error.message : t.common.error);
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting countermeasure:', { description, assigneeId, deadline });

    if (!description.trim() || !assigneeId || !deadline) {
      console.warn('Validation failed:', { description: description.trim(), assigneeId, deadline });
      toast.error(t.common.error);
      return;
    }

    createMutation.mutate({
      risk_id: riskId,
      target_type: targetType,
      cause_id: targetType === 'CAUSE' ? targetId : undefined,
      consequence_id: targetType === 'CONSEQUENCE' ? targetId : undefined,
      description: description.trim(),
      assignee_id: assigneeId,
      deadline: deadline + 'T23:59:59Z',
    });
  };

  const userOptions = (usersData || []).map((u: User) => ({
    label: u.full_name,
    value: u.id,
    subtitle: u.email,
  }));

  const isLoading = createMutation.isPending;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1 border-pink-200 text-gray-700 hover:bg-pink-100/50 hover:border-pink-300 text-xs"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="h-3 w-3" />
        {t.risk.addCountermeasure}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50" onClick={() => { setIsOpen(false); setDescription(''); setAssigneeId(''); setDeadline(''); }}>
          <div className="absolute bottom-6 right-6 w-[480px] max-h-[calc(100vh-3rem)]" onClick={e => e.stopPropagation()}>
            <div className="bg-pink-50/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-pink-200/60 overflow-hidden flex flex-col max-h-[calc(100vh-3rem)]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-pink-200/50 bg-gradient-to-r from-pink-200/40 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-pink-300/40 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{t.risk.addCountermeasure}</h3>
                    <p className="text-xs text-pink-500/70">
                      {targetType === 'CAUSE' ? t.risk.forThisCause : t.risk.forThisConsequence}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsOpen(false); setDescription(''); setAssigneeId(''); setDeadline(''); }}
                  className="h-7 w-7 rounded-lg hover:bg-pink-300/30 flex items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                <form onSubmit={handleSubmit}>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-gray-700 text-xs font-medium">{t.risk.countermeasureDescription} *</Label>
                      <Textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={3}
                        placeholder={t.risk.countermeasureDescription}
                        className="bg-white/70 border-pink-200 text-gray-900 placeholder:text-gray-400 text-sm focus:border-pink-400"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label className="text-gray-700 text-xs font-medium">{t.risk.countermeasureAssignee} *</Label>
                      <Autocomplete
                        options={userOptions}
                        value={assigneeId}
                        onChange={setAssigneeId}
                        placeholder={t.risk.countermeasureAssignee}
                        className="bg-white/70 border-pink-200 text-gray-900"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label className="text-gray-700 text-xs font-medium">{t.risk.countermeasureDeadline} *</Label>
                      <Input
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="bg-white/70 border-pink-200 text-gray-900 text-sm focus:border-pink-400"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-pink-200/50">
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setIsOpen(false); setDescription(''); setAssigneeId(''); setDeadline(''); }} className="text-gray-600 hover:bg-pink-100/50 text-xs">
                      {t.common.cancel}
                    </Button>
                    <Button type="submit" disabled={isLoading} size="sm" className="bg-pink-500 hover:bg-pink-600 text-white text-xs">
                      {isLoading ? (
                        <><Loader2 className="h-3 w-3 animate-spin mr-1" /> {t.common.saving}</>
                      ) : t.risk.addCountermeasure}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
