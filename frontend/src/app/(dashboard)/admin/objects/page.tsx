'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Loader2, Search, X } from 'lucide-react';
import { riskObjectService } from '@/lib/api-services';
import type { RiskObject } from '@/types/api';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/language-context';

const typeColors = {
  IT_SYSTEM: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PROJECT: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  PROCESS: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
} as const;

function ObjectTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead><Skeleton className="h-4 w-32" /></TableHead>
          <TableHead><Skeleton className="h-4 w-20" /></TableHead>
          <TableHead><Skeleton className="h-4 w-40" /></TableHead>
          <TableHead className="w-[80px]"><Skeleton className="h-4 w-20" /></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(5)].map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function AdminObjectsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['risk-objects'],
    queryFn: () => riskObjectService.list().then(res => res.data),
  });

  const createObject = useMutation({
    mutationFn: (data: { name: string; object_type: string; description?: string }) => riskObjectService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-objects'] });
      toast.success('Risk object created successfully');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create risk object');
    },
  });

  const updateObject = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; object_type: string; description?: string } }) => riskObjectService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-objects'] });
      toast.success('Risk object updated successfully');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update risk object');
    },
  });

  const deleteObject = useMutation({
    mutationFn: (id: string) => riskObjectService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-objects'] });
      toast.success('Risk object deleted');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete risk object');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.object.riskObjects}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{t.object.manageDefinitions}</p>
          </div>
          <ObjectCreateDialog onCreate={createObject.mutate} />
        </div>
        <Card>
          <CardContent className="pt-0">
            <ObjectTableSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  const objects = data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.object.riskObjects}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t.object.manageDefinitions}</p>
        </div>
        <ObjectCreateDialog onCreate={createObject.mutate} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">{t.object.riskObjects} ({objects.length})</CardTitle>
            <Input
              placeholder={t.object.searchObjects}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead>{t.object.nameLabel}</TableHead>
                  <TableHead>{t.object.typeLabel}</TableHead>
                  <TableHead>{t.object.descriptionLabel}</TableHead>
                  <TableHead className="w-[100px]">{t.report.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {objects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-gray-500 dark:text-gray-400">
                      {t.object.noRiskObjectsFound}
                    </TableCell>
                  </TableRow>
                ) : (
                  objects.map((object: RiskObject) => (
                    <TableRow key={object.id}>
                      <TableCell className="font-medium text-gray-900 dark:text-white max-w-[200px] truncate">{object.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn('capitalize', typeColors[object.object_type as keyof typeof typeColors] || '')}>
                          {object.object_type.toLowerCase().replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400 max-w-md truncate">
                        {object.description || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ObjectEditDialog object={object} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['risk-objects'] })} />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this risk object?')) {
                                deleteObject.mutate(object.id);
                              }
                            }}
                            disabled={deleteObject.isPending}
                          >
                            {deleteObject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ObjectCreateDialog({ onCreate }: { onCreate: (data: { name: string; object_type: string; description?: string }) => void }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [objectType, setObjectType] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !objectType) {
      toast.error(t.common.error);
      return;
    }
    setIsLoading(true);
    onCreate({ name, object_type: objectType, description: description || undefined });
    setName('');
    setObjectType('');
    setDescription('');
    setIsOpen(false);
    setIsLoading(false);
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        {t.object.createObject}
      </Button>
    );
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        {t.object.createObject}
      </Button>

      <div className="fixed inset-0 z-50 pointer-events-none">
        <div className="absolute bottom-6 right-6 w-[480px] max-h-[calc(100vh-3rem)] pointer-events-auto transition-all duration-300 ease-out opacity-100 scale-100 translate-y-0">
          <div className="bg-pink-50/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-pink-200/60 overflow-hidden flex flex-col max-h-[calc(100vh-3rem)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-pink-200/50 bg-gradient-to-r from-pink-200/40 to-transparent">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-pink-300/40 flex items-center justify-center">
                  <Plus className="h-4 w-4 text-pink-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{t.object.createObject}</h3>
                  <p className="text-xs text-pink-500/70">{t.object.manageDefinitions}</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="h-7 w-7 rounded-lg hover:bg-pink-300/30 flex items-center justify-center transition-colors">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-gray-700 text-xs font-medium">{t.object.nameLabel} *</Label>
                    <Input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      placeholder={t.object.objectNamePlaceholder}
                      disabled={isLoading}
                      className="bg-white/60 border-pink-200 text-gray-900 placeholder:text-gray-400 text-sm focus:border-pink-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 text-xs font-medium">{t.object.typeLabel} *</Label>
                    <Select value={objectType} onValueChange={setObjectType}>
                      <SelectTrigger className="bg-white/60 border-pink-200 text-gray-900">
                        <SelectValue placeholder={t.object.typeLabel} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IT_SYSTEM">{t.object.itSystem}</SelectItem>
                        <SelectItem value="PROJECT">{t.object.project}</SelectItem>
                        <SelectItem value="PROCESS">{t.object.process}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-gray-700 text-xs font-medium">{t.object.descriptionLabel}</Label>
                    <Textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder={t.object.descriptionPlaceholder}
                      rows={2}
                      disabled={isLoading}
                      className="bg-white/60 border-pink-200 text-gray-900 placeholder:text-gray-400 text-sm focus:border-pink-400"
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-2 border-t border-pink-200/50">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="border-pink-200 text-gray-700 hover:bg-pink-100/50 text-xs">
                    {t.common.cancel}
                  </Button>
                  <Button type="submit" disabled={isLoading} className="bg-pink-500 hover:bg-pink-600 text-white text-xs">
                    {isLoading ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> {t.common.saving}</> : t.object.createObject}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ObjectEditDialog({ object, onSuccess }: { object: RiskObject; onSuccess: () => void }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      object_type: formData.get('object_type') as string,
      description: formData.get('description') as string || undefined,
    };

    if (!data.name || !data.object_type) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    updateObject.mutate({ id: object.id, data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['risk-objects'] });
        onSuccess();
        toast.success('Risk object updated successfully');
      },
      onError: (error: unknown) => {
        toast.error(error instanceof Error ? error.message : 'Failed to update risk object');
      },
      onSettled: () => {
        setIsLoading(false);
        setIsOpen(false);
      },
    });
  };

  const updateObject = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; object_type: string; description?: string } }) => riskObjectService.update(id, data),
  });

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)} disabled={isLoading}>
        <Edit className="h-4 w-4" />
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.object.editObject}</DialogTitle>
            <DialogDescription>{t.object.updateObjectDetails}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_name">{t.object.nameLabel} *</Label>
                <Input id="edit_name" name="name" defaultValue={object.name} required disabled={isLoading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_object_type">{t.object.typeLabel} *</Label>
                <Select name="object_type" defaultValue={object.object_type} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IT_SYSTEM">{t.object.itSystem}</SelectItem>
                    <SelectItem value="PROJECT">{t.object.project}</SelectItem>
                    <SelectItem value="PROCESS">{t.object.process}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_description">{t.object.descriptionLabel}</Label>
                <Textarea id="edit_description" name="description" defaultValue={object.description || ''} placeholder={t.object.description} rows={3} disabled={isLoading} />
              </div>
            </div>
            <DialogFooter className="border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>{t.common.cancel}</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t.user.creating}
                  </>
                ) : (
                  t.user.saveChanges
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}