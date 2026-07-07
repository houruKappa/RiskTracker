'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Autocomplete } from '@/components/ui/Autocomplete';
import { riskService } from '@/lib/api-services';
import { riskObjectService } from '@/lib/api-services';
import { userService } from '@/lib/api-services';
import type { RiskObject, User } from '@/types/api';
import { useLanguage } from '@/lib/language-context';
import { toast } from 'sonner';
import { Loader2, Plus, X } from 'lucide-react';

interface CreateRiskFormProps {
  onSuccess?: () => void;
}

export function CreateRiskDialog({ onSuccess }: CreateRiskFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [section, setSection] = useState(1);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState('');
  const [targetId, setTargetId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [probability, setProbability] = useState('MEDIUM');
  const [impact, setImpact] = useState('MEDIUM');
  const [financialLoss, setFinancialLoss] = useState('');
  const [reputationalLoss, setReputationalLoss] = useState('');
  const [legalConsequences, setLegalConsequences] = useState('');
  const [comment, setComment] = useState('');
  const [causes, setCauses] = useState([{ name: '', description: '', probability: 'MEDIUM' }]);
  const [consequences, setConsequences] = useState([{ name: '', description: '', probability: 'MEDIUM' }]);
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

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
      toast.success(t.risk.riskCreated);
      resetForm();
      setIsOpen(false);
      onSuccess?.();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to create risk';
      toast.error(message);
    },
    onSettled: () => setIsLoading(false),
  });

  const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const legalLevels = [1, 2, 3, 4, 5];

  const resetForm = () => {
    setTitle('');
    setTargetId('');
    setOwnerId('');
    setProbability('MEDIUM');
    setImpact('MEDIUM');
    setFinancialLoss('');
    setReputationalLoss('');
    setLegalConsequences('');
    setComment('');
    setCauses([{ name: '', description: '', probability: 'MEDIUM' }]);
    setConsequences([{ name: '', description: '', probability: 'MEDIUM' }]);
    setSection(1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filteredCauses = causes.filter(c => c.name.trim());
    const filteredConsequences = consequences.filter(c => c.name.trim());
    if (!title || !targetId || !ownerId) {
      toast.error('Fill required fields');
      return;
    }
    const data = {
      title, target_id: targetId, owner_id: ownerId,
      probability, impact,
      financial_loss: financialLoss || undefined,
      reputational_loss: reputationalLoss || undefined,
      legal_consequences: legalConsequences ? parseInt(legalConsequences) : undefined,
      comment: comment || undefined,
      causes: filteredCauses.map(c => ({ name: c.name, description: c.description || undefined, probability: c.probability })),
      consequences: filteredConsequences.map(c => ({ name: c.name, description: c.description || undefined, probability: c.probability })),
    };
    setIsLoading(true);
    createMutation.mutate(data);
  };

  const objectOptions = (objectsData || []).map((o: RiskObject) => ({ label: `${o.name} (${o.object_type})`, value: o.id }));
  const userOptions = (usersData || []).map((u: User) => ({ label: u.full_name, value: u.id, subtitle: u.email }));

  const maxCauseProb = riskLevels[Math.max(0, ...causes.filter(c => c.name).map(c => riskLevels.indexOf(c.probability)))];
  const maxConseqProb = riskLevels[Math.max(0, ...consequences.filter(c => c.name).map(c => riskLevels.indexOf(c.probability)))];

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        + {t.risk.createRisk}
      </Button>
    );
  }

  return (
    <>
      <div className="hidden lg:block">
        <Button onClick={() => setIsOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          + {t.risk.createRisk}
        </Button>
      </div>

      <div className="fixed inset-0 z-50 pointer-events-none">
        <div
          ref={panelRef}
          className={`absolute bottom-6 right-6 w-[680px] max-h-[calc(100vh-3rem)] pointer-events-auto transition-all duration-300 ease-out ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}
        >
          <div className="bg-pink-50/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-pink-200/60 overflow-hidden flex flex-col max-h-[calc(100vh-3rem)]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-pink-200/50 bg-gradient-to-r from-pink-200/40 to-transparent">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-pink-300/40 flex items-center justify-center">
                  <Plus className="h-4 w-4 text-pink-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{t.risk.createRisk}</h3>
                  <p className="text-xs text-pink-500/70">{t.common.stepOf.replace('{current}', String(section)).replace('{total}', '3')}</p>
                </div>
              </div>
              <button onClick={() => { resetForm(); setIsOpen(false); }} className="h-7 w-7 rounded-lg hover:bg-pink-300/30 flex items-center justify-center transition-colors">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="flex gap-1 px-6 pt-3 pb-1">
              {[1, 2, 3].map(s => (
                <button
                  key={s}
                  onClick={() => setSection(s)}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${section === s ? 'bg-pink-400' : section > s ? 'bg-pink-300/50' : 'bg-pink-200/50'}`}
                />
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-hide" style={{ scrollBehavior: 'smooth' }}>
              <form id="create-risk-form" onSubmit={handleSubmit}>
                {section === 1 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                      <p className="text-xs font-medium text-pink-500/70 uppercase tracking-wider mb-4">{t.risk.stepRiskIdentification}</p>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-gray-700 text-xs font-medium">{t.risk.riskName} *</Label>
                          <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder={t.risk.riskName} className="h-9 bg-white/60 border-pink-200 text-gray-900 placeholder:text-gray-400 text-sm focus:border-pink-400" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-gray-700 text-xs font-medium">{t.risk.riskObject} *</Label>
                          <Autocomplete options={objectOptions} value={targetId} onChange={setTargetId} placeholder={t.risk.riskObject} className="h-9" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-gray-700 text-xs font-medium">{t.risk.riskOwner} *</Label>
                          <Autocomplete options={userOptions} value={ownerId} onChange={setOwnerId} placeholder={t.risk.riskOwner} className="h-9" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {section === 2 && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                    <p className="text-xs font-medium text-pink-500/70 uppercase tracking-wider mb-3">{t.risk.stepRiskAnalysis}</p>
                    <div className="overflow-hidden rounded-xl border border-pink-200/50">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-pink-100/30">
                            <th className="text-left px-3 py-2 text-[11px] font-medium text-gray-600 w-[22%]">{t.risk.causeNameLabel}</th>
                            <th className="text-left px-3 py-2 text-[11px] font-medium text-gray-600 w-[13%]">{t.risk.causeProbabilityLabel}</th>
                            <th className="text-left px-3 py-2 text-[11px] font-medium text-gray-600 w-[30%]">{t.risk.riskEventLabel}</th>
                            <th className="text-left px-3 py-2 text-[11px] font-medium text-gray-600 w-[22%]">{t.risk.consequenceNameLabel}</th>
                            <th className="text-left px-3 py-2 text-[11px] font-medium text-gray-600 w-[13%]">{t.risk.consequenceImpactLabel}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {causes.map((cause, i) => (
                            <tr key={i} className="border-t border-pink-200/30">
                              <td className="px-2 py-1.5">
                                <Input value={cause.name} onChange={e => { const n = [...causes]; n[i].name = e.target.value; setCauses(n); }} placeholder={t.risk.causeNameLabel} className="h-8 text-xs bg-white/60 border-pink-200 text-gray-900 placeholder:text-gray-400" />
                              </td>
                              <td className="px-2 py-1.5">
                                <Select value={cause.probability} onValueChange={v => { const n = [...causes]; n[i].probability = v; setCauses(n); }}>
                                  <SelectTrigger className="h-8 text-xs bg-white/60 border-pink-200"><SelectValue /></SelectTrigger>
                                  <SelectContent>{riskLevels.map(l => <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>)}</SelectContent>
                                </Select>
                              </td>
                              {i === 0 && (
                                <td className="px-2 py-1.5" rowSpan={Math.max(causes.length, consequences.length)}>
                                  <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder={t.risk.riskEventLabel} className="min-h-[120px] text-xs bg-white/60 border-pink-200 text-gray-900 placeholder:text-gray-400" style={{ minHeight: `${Math.max(100, causes.length * 52)}px` }} />
                                </td>
                              )}
                              <td className="px-2 py-1.5">
                                <Input value={consequences[i]?.name || ''} onChange={e => { const n = [...consequences]; if (!n[i]) n[i] = { name: '', description: '', probability: 'MEDIUM' }; n[i].name = e.target.value; setConsequences(n); }} placeholder={t.risk.consequenceNameLabel} className="h-8 text-xs bg-white/60 border-pink-200 text-gray-900 placeholder:text-gray-400" />
                              </td>
                              <td className="px-2 py-1.5">
                                <Select value={consequences[i]?.probability || 'MEDIUM'} onValueChange={v => { const n = [...consequences]; if (!n[i]) n[i] = { name: '', description: '', probability: 'MEDIUM' }; n[i].probability = v; setConsequences(n); }}>
                                  <SelectTrigger className="h-8 text-xs bg-white/60 border-pink-200"><SelectValue /></SelectTrigger>
                                  <SelectContent>{riskLevels.map(l => <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>)}</SelectContent>
                                </Select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex items-center justify-between px-3 py-2 border-t border-pink-200/30 bg-pink-100/20">
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setCauses([...causes, { name: '', description: '', probability: 'MEDIUM' }]); setConsequences([...consequences, { name: '', description: '', probability: 'MEDIUM' }]); }} className="h-7 text-xs text-pink-600 hover:text-pink-700 hover:bg-pink-100/50 gap-1">
                          <Plus className="h-3 w-3" /> {t.common.addRow}
                        </Button>
                        <div className="flex gap-4 text-xs">
                          <span className="text-gray-500">{t.common.maxProbability}: <span className="font-semibold text-pink-600">{maxCauseProb}</span></span>
                          <span className="text-gray-500">{t.common.maxImpact}: <span className="font-semibold text-pink-600">{maxConseqProb}</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {section === 3 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <p className="text-xs font-medium text-pink-500/70 uppercase tracking-wider mb-3">{t.risk.stepImpactAssessment}</p>
                    <div className="grid gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-gray-700 text-xs font-medium">{t.risk.impactRequired}</Label>
                          <Select value={impact} onValueChange={setImpact}>
                            <SelectTrigger className="h-9 bg-white/60 border-pink-200 text-gray-900"><SelectValue /></SelectTrigger>
                            <SelectContent>{riskLevels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-gray-700 text-xs font-medium">{t.risk.reputationalLoss}</Label>
                          <Select value={reputationalLoss} onValueChange={setReputationalLoss}>
                            <SelectTrigger className="h-9 bg-white/60 border-pink-200 text-gray-900"><SelectValue placeholder="-" /></SelectTrigger>
                            <SelectContent>{riskLevels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-gray-700 text-xs font-medium">{t.risk.financialLoss}</Label>
                          <Input value={financialLoss} onChange={e => setFinancialLoss(e.target.value)} placeholder="50000 USD" className="h-9 bg-white/60 border-pink-200 text-gray-900 placeholder:text-gray-400 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-gray-700 text-xs font-medium">{t.risk.legalConsequences}</Label>
                          <Select value={legalConsequences} onValueChange={setLegalConsequences}>
                            <SelectTrigger className="h-9 bg-white/60 border-pink-200 text-gray-900"><SelectValue placeholder="-" /></SelectTrigger>
                            <SelectContent>{legalLevels.map(l => <SelectItem key={l} value={l.toString()}>{l}/5</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-t border-pink-200/50 bg-pink-100/20">
              <div className="flex gap-2">
                {section > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSection(s => s - 1)} className="h-8 text-xs text-gray-600 hover:text-gray-800 hover:bg-pink-100/50">
                    {t.common.back}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => { resetForm(); setIsOpen(false); }} className="h-8 text-xs text-gray-500 hover:text-gray-700 hover:bg-pink-100/50">
                  {t.common.cancelBtn}
                </Button>
                {section < 3 ? (
                  <Button type="button" size="sm" onClick={() => setSection(s => s + 1)} className="h-8 text-xs bg-pink-500 hover:bg-pink-600 text-white">
                    {t.common.continue}
                  </Button>
                ) : (
                  <Button type="submit" form="create-risk-form" disabled={isLoading} size="sm" className="h-8 text-xs bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white shadow-lg shadow-pink-300/30">
                    {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : t.risk.createRisk}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
