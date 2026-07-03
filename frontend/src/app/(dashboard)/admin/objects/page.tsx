'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Loader2, Search } from 'lucide-react';
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Risk Objects</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage risk object definitions</p>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Risk Objects</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage risk object definitions</p>
        </div>
        <ObjectCreateDialog onCreate={createObject.mutate} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">Risk Objects ({objects.length})</CardTitle>
            <Input
              placeholder="Search objects..."
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
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {objects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-gray-500 dark:text-gray-400">
                      No risk objects found
                    </TableCell>
                  </TableRow>
                ) : (
                  objects.map((object: RiskObject) => (
                    <TableRow key={object.id}>
                      <TableCell className="font-medium text-gray-900 dark:text-white">{object.name}</TableCell>
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
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
    onCreate(data);
    setIsOpen(false);
    setIsLoading(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Object
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Risk Object</DialogTitle>
            <DialogDescription>Define a new risk object</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" required placeholder="e.g., ERP System" disabled={isLoading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="object_type">Type *</Label>
                <Select name="object_type" required disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IT_SYSTEM">IT System</SelectItem>
                    <SelectItem value="PROJECT">Project</SelectItem>
                    <SelectItem value="PROCESS">Process</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="Optional description" rows={3} disabled={isLoading} />
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
                  'Create Object'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ObjectEditDialog({ object, onSuccess }: { object: RiskObject; onSuccess: () => void }) {
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
            <DialogTitle>Edit Risk Object</DialogTitle>
            <DialogDescription>Update risk object details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_name">Name *</Label>
                <Input id="edit_name" name="name" defaultValue={object.name} required disabled={isLoading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_object_type">Type *</Label>
                <Select name="object_type" defaultValue={object.object_type} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IT_SYSTEM">IT System</SelectItem>
                    <SelectItem value="PROJECT">Project</SelectItem>
                    <SelectItem value="PROCESS">Process</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_description">Description</Label>
                <Textarea id="edit_description" name="description" defaultValue={object.description || ''} placeholder="Optional description" rows={3} disabled={isLoading} />
              </div>
            </div>
            <DialogFooter className="border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
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
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}