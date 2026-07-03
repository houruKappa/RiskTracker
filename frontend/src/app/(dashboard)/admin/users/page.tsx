'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Loader2, Edit, Key, Trash2 } from 'lucide-react';
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage system users and permissions</p>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage system users and permissions</p>
        </div>
        <UserCreateDialog onCreate={createUser.mutate} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">Users ({data?.length || 0})</CardTitle>
            <Input
              placeholder="Search users..."
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
                  <TableHead>Email</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-gray-500 dark:text-gray-400">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono text-sm">{user.email}</TableCell>
                      <TableCell>{user.full_name}</TableCell>
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
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('email') as string,
      full_name: formData.get('full_name') as string,
      password: formData.get('password') as string,
      role: formData.get('role') as 'USER' | 'ADMIN',
    };

    if (!data.email || !data.full_name || !data.password || !data.role) {
      toast.error('Please fill in all fields');
      return;
    }

    if (data.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    onCreate(data);
    setTimeout(() => {
      setIsOpen(false);
      setIsLoading(false);
    }, 100);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create User
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Fill in the details to create a new user account</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" required placeholder="user@example.com" disabled={isLoading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input id="full_name" name="full_name" required placeholder="John Doe" disabled={isLoading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password * (min 6 chars)</Label>
                <Input id="password" name="password" type="password" required placeholder="••••••••" disabled={isLoading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role *</Label>
                <Select name="role" required disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
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
                  'Create User'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function UserEditDialog({ user, onSuccess }: { user: User; onSuccess: () => void }) {
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
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_email">Email *</Label>
                <Input id="edit_email" name="email" type="email" defaultValue={user.email} required disabled={isLoading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_full_name">Full Name *</Label>
                <Input id="edit_full_name" name="full_name" defaultValue={user.full_name} required disabled={isLoading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_role">Role *</Label>
                <Select name="role" defaultValue={user.role} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
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

function UserResetPasswordDialog({ userId, onSuccess }: { userId: string; onSuccess: (data: { id: string; password: string }) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;

    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
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
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Enter a new password for this user</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="new_password">New Password * (min 6 chars)</Label>
                <Input id="new_password" name="password" type="password" required placeholder="••••••••" disabled={isLoading} />
              </div>
            </div>
            <DialogFooter className="border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading} className="bg-amber-600 hover:bg-amber-700">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}