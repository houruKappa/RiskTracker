'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Loader2, Edit, Key, Trash2, X } from 'lucide-react';
import { userService } from '@/lib/api-services';
import type { User } from '@/types/api';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/language-context';

const roleColors = {
  ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  USER: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
} as const;

function UserTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead><Skeleton className="h-4 w-32" /></TableHead>
          <TableHead><Skeleton className="h-4 w-32" /></TableHead>
          <TableHead><Skeleton className="h-4 w-20" /></TableHead>
          <TableHead><Skeleton className="h-4 w-24" /></TableHead>
          <TableHead className="w-[80px]"><Skeleton className="h-4 w-20" /></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(5)].map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function AdminUsersPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, limit, search],
    queryFn: () => userService.list().then(res => res.data),
  });

  const createUser = useMutation({
    mutationFn: (data: { email: string; full_name: string; password: string; role: 'USER' | 'ADMIN' }) => userService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create user');
    },
  });

  const resetPassword = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => userService.resetPassword(id, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Password reset successfully');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to reset password');
    },
  });

  const filteredUsers = data?.filter(user => 
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.full_name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.user.userManagement}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{t.user.manageUsersAndPermissions}</p>
          </div>
          <UserCreateDialog onCreate={createUser.mutate} />
        </div>
        <Card>
          <CardContent className="pt-0">
            <UserTableSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.user.userManagement}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t.user.manageUsersAndPermissions}</p>
        </div>
        <UserCreateDialog onCreate={createUser.mutate} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">{t.user.title} ({data?.length || 0})</CardTitle>
            <Input
              placeholder={t.user.searchUsers}
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
                  <TableHead>{t.user.emailLabel}</TableHead>
                  <TableHead>{t.user.fullNameLabel}</TableHead>
                  <TableHead>{t.user.roleLabel}</TableHead>
                  <TableHead>{t.risk.created}</TableHead>
                  <TableHead className="w-[80px]">{t.report.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-gray-500 dark:text-gray-400">
                      {t.user.noUsersFound}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono text-sm max-w-[200px] truncate">{user.email}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{user.full_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn('capitalize', roleColors[user.role as keyof typeof roleColors] || '')}>
                          {user.role.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserEditDialog user={user} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['users'] })} />
                          <UserResetPasswordDialog userId={user.id} onSuccess={resetPassword.mutate} />
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

function UserCreateDialog({ onCreate }: { onCreate: (data: { email: string; full_name: string; password: string; role: 'USER' | 'ADMIN' }) => void }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName || !password) {
      toast.error(t.common.error);
      return;
    }
    if (password.length < 6) {
      toast.error(t.user.passwordLabel);
      return;
    }
    setIsLoading(true);
    onCreate({ email, full_name: fullName, password, role });
    setEmail('');
    setFullName('');
    setPassword('');
    setRole('USER');
    setIsOpen(false);
    setIsLoading(false);
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        {t.user.createUser}
      </Button>
    );
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        {t.user.createUser}
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
                  <h3 className="font-semibold text-gray-900 text-sm">{t.user.createUser}</h3>
                  <p className="text-xs text-pink-500/70">{t.user.manageUsersAndPermissions}</p>
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
                    <Label className="text-gray-700 text-xs font-medium">{t.user.emailLabel} *</Label>
                    <Input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="user@example.com" disabled={isLoading} className="bg-white/60 border-pink-200 text-gray-900 placeholder:text-gray-400 text-sm focus:border-pink-400" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 text-xs font-medium">{t.user.fullNameLabel} *</Label>
                    <Input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="John Doe" disabled={isLoading} className="bg-white/60 border-pink-200 text-gray-900 placeholder:text-gray-400 text-sm focus:border-pink-400" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 text-xs font-medium">{t.user.passwordLabel}</Label>
                    <Input value={password} onChange={e => setPassword(e.target.value)} type="password" required placeholder="••••••••" disabled={isLoading} className="bg-white/60 border-pink-200 text-gray-900 placeholder:text-gray-400 text-sm focus:border-pink-400" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 text-xs font-medium">{t.user.roleLabel} *</Label>
                    <Select value={role} onValueChange={(v: 'USER' | 'ADMIN') => setRole(v)}>
                      <SelectTrigger className="bg-white/60 border-pink-200 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">{t.user.user}</SelectItem>
                        <SelectItem value="ADMIN">{t.user.admin}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-2 border-t border-pink-200/50">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="border-pink-200 text-gray-700 hover:bg-pink-100/50 text-xs">
                    {t.common.cancel}
                  </Button>
                  <Button type="submit" disabled={isLoading} className="bg-pink-500 hover:bg-pink-600 text-white text-xs">
                    {isLoading ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> {t.common.saving}</> : t.user.createUser}
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

function UserEditDialog({ user, onSuccess }: { user: User; onSuccess: () => void }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: { email: string; full_name: string; role: 'USER' | 'ADMIN' }) => userService.update(user.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onSuccess();
      toast.success('User updated successfully');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('email') as string,
      full_name: formData.get('full_name') as string,
      role: formData.get('role') as 'USER' | 'ADMIN',
    };
    setIsLoading(true);
    updateMutation.mutate(data, {
      onSettled: () => {
        setIsLoading(false);
        setIsOpen(false);
      },
    });
  };

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)} disabled={isLoading}>
        <Edit className="h-4 w-4" />
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.user.editUser}</DialogTitle>
            <DialogDescription>{t.user.updateUserDetails}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_email">{t.user.emailLabel} *</Label>
                <Input id="edit_email" name="email" type="email" defaultValue={user.email} required disabled={isLoading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_full_name">{t.user.fullNameLabel} *</Label>
                <Input id="edit_full_name" name="full_name" defaultValue={user.full_name} required disabled={isLoading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_role">{t.user.roleLabel} *</Label>
                <Select name="role" defaultValue={user.role} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">{t.user.user}</SelectItem>
                    <SelectItem value="ADMIN">{t.user.admin}</SelectItem>
                  </SelectContent>
                </Select>
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

function UserResetPasswordDialog({ userId, onSuccess }: { userId: string; onSuccess: (data: { id: string; password: string }) => void }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;

    if (!password || password.length < 6) {
      toast.error(t.user.passwordLabel);
      return;
    }

    setIsLoading(true);
    onSuccess({ id: userId, password });
    setIsOpen(false);
    setIsLoading(false);
  };

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)} className="text-amber-600 hover:text-amber-700" disabled={isLoading}>
        <Key className="h-4 w-4" />
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.user.passwordReset}</DialogTitle>
            <DialogDescription>{t.user.enterNewPassword}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="new_password">{t.user.passwordLabel}</Label>
                <Input id="new_password" name="password" type="password" required placeholder="••••••••" disabled={isLoading} />
              </div>
            </div>
            <DialogFooter className="border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>{t.common.cancel}</Button>
              <Button type="submit" disabled={isLoading} className="bg-amber-600 hover:bg-amber-700">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t.user.resetting}
                  </>
                ) : (
                  t.user.reset
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}