'use client';

import { useLanguage } from '@/lib/language-context';
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { riskService, riskObjectService, userService } from '@/lib/api-services';
import type { Risk, RiskObject, User } from '@/types/api';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { CreateRiskDialog } from '@/components/risk/CreateRiskDialog';
import { Autocomplete } from '@/components/ui/Autocomplete';

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

function RiskTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]"><Skeleton className="h-4 w-16" /></TableHead>
          <TableHead><Skeleton className="h-4 w-32" /></TableHead>
          <TableHead><Skeleton className="h-4 w-24" /></TableHead>
          <TableHead><Skeleton className="h-4 w-24" /></TableHead>
          <TableHead><Skeleton className="h-4 w-24" /></TableHead>
          <TableHead><Skeleton className="h-4 w-24" /></TableHead>
          <TableHead><Skeleton className="h-4 w-24" /></TableHead>
          <TableHead className="w-[100px]"><Skeleton className="h-4 w-20" /></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(5)].map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function RisksPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [targetFilter, setTargetFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [search, setSearch] = useState('');

  const { t } = useLanguage();

  const { data: risksData, isLoading: risksLoading } = useQuery({
    queryKey: ['risks', page, limit, statusFilter, targetFilter, ownerFilter, search],
    queryFn: () => riskService.list({
      page,
      limit,
      status: statusFilter || undefined,
      target_id: targetFilter || undefined,
      search: search || undefined,
    }).then(res => res.data),
    placeholderData: (previousData) => previousData,
  });

  const { data: objectsData } = useQuery({
    queryKey: ['risk-objects'],
    queryFn: () => riskObjectService.list().then(res => res.data),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.list().then(res => res.data),
  });

  const objects: RiskObject[] = objectsData || [];
  const users: User[] = usersData || [];

  const getObjectName = (targetId: string) => {
    const obj = objects.find(o => o.id === targetId);
    return obj?.name || targetId;
  };

  const getOwnerName = (ownerId: string) => {
    const user = users.find(u => u.id === ownerId);
    return user?.full_name || ownerId;
  };

  const handleFilterChange = useCallback((setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  }, []);

  if (risksLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.risk.title}</h1>
          </div>
          <CreateRiskDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ['risks'] })} />
        </div>
        <Card>
          <CardContent className="pt-0">
            <RiskTableSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  const risks = risksData?.items || [];
  const totalCount = risksData?.total_count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.risk.title}</h1>
        </div>
        <CreateRiskDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ['risks'] })} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Поиск</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Поиск по названию, ID, владельцу..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.risk.status}</Label>
              <Autocomplete
                clearable
                options={[
                  { value: 'IN_PROGRESS', label: t.risk.inProgress },
                  { value: 'COMPLETED', label: t.risk.completed },
                ]}
                value={statusFilter}
                onChange={handleFilterChange(setStatusFilter)}
                placeholder={t.common.none}
                emptyMessage={t.common.none}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.risk.riskObject}</Label>
              <Autocomplete
                clearable
                options={objects.map(o => ({ value: o.id, label: o.name }))}
                value={targetFilter}
                onChange={handleFilterChange(setTargetFilter)}
                placeholder={t.common.none}
                emptyMessage={t.common.none}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.risk.riskOwner}</Label>
              <Autocomplete
                clearable
                options={users.map(u => ({ value: u.id, label: u.full_name, subtitle: u.email }))}
                value={ownerFilter}
                onChange={handleFilterChange(setOwnerFilter)}
                placeholder={t.common.none}
                emptyMessage={t.common.none}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>{t.risk.riskName}</TableHead>
                  <TableHead>{t.risk.riskObject}</TableHead>
                  <TableHead>{t.risk.riskOwner}</TableHead>
                  <TableHead>{t.risk.status}</TableHead>
                  <TableHead>{t.risk.probability}</TableHead>
                  <TableHead>{t.risk.impact}</TableHead>
                  <TableHead className="w-[100px]">{t.risk.created}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {risks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-gray-500 dark:text-gray-400">
                      {t.common.noData}
                    </TableCell>
                  </TableRow>
                ) : (
                  risks.map((risk: Risk) => (
                    <TableRow key={risk.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => window.location.href = `/risks/${risk.id}`}>
                      <TableCell className="font-mono text-xs text-gray-500 dark:text-gray-400" title={risk.id}>
                        {risk.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium text-gray-900 dark:text-white max-w-[200px] truncate" title={risk.title}>
                        {risk.title}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 dark:text-gray-400 max-w-[150px] truncate block">
                          {getObjectName(risk.target_id)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 dark:text-gray-400 max-w-[150px] truncate block">
                          {getOwnerName(risk.owner_id)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={cn('capitalize', statusColors[risk.status as keyof typeof statusColors] || '')}
                        >
                          {risk.status === 'IN_PROGRESS' ? t.risk.inProgress : t.risk.completed}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn('capitalize', levelColors[risk.probability as keyof typeof levelColors] || '')}>
                          {risk.probability}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn('capitalize', levelColors[risk.impact as keyof typeof levelColors] || '')}>
                          {risk.impact}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(risk.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={8} className="py-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t.common.showingXtoYofZ
                          .replace('{from}', String(((page - 1) * limit) + 1))
                          .replace('{to}', String(Math.min(page * limit, totalCount)))
                          .replace('{total}', String(totalCount))}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {t.common.pageXofY
                            .replace('{current}', String(page))
                            .replace('{total}', String(totalPages || 1))}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages || totalPages === 0}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
