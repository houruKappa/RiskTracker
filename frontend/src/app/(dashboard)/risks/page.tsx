'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Filter, ChevronLeft, ChevronRight, Search, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { riskService } from '@/lib/api-services';
import { riskObjectService } from '@/lib/api-services';
import { userService } from '@/lib/api-services';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CreateRiskDialog } from '@/components/risk/CreateRiskDialog';

const statusColors = {
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
} as const;

function RiskTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40px]"><Skeleton className="h-4 w-4" /></TableHead>
          <TableHead><Skeleton className="h-4 w-32" /></TableHead>
          <TableHead><Skeleton className="h-4 w-24" /></TableHead>
          <TableHead><Skeleton className="h-4 w-20" /></TableHead>
          <TableHead><Skeleton className="h-4 w-24" /></TableHead>
          <TableHead><Skeleton className="h-4 w-24" /></TableHead>
          <TableHead><Skeleton className="h-4 w-20" /></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(5)].map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-4" /></TableCell>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
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
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [targetFilter, setTargetFilter] = useState<string>('');
  const [ownerFilter, setOwnerFilter] = useState<string>('');

  const { data: risksData, isLoading: risksLoading } = useQuery({
    queryKey: ['risks', page, limit, statusFilter, targetFilter, ownerFilter],
    queryFn: () => riskService.list({ page, limit, status: statusFilter || undefined, target_id: targetFilter || undefined }).then(res => res.data),
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

  const handleFilterChange = () => {
    setPage(1);
  };

  if (risksLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Risks</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and track all risks</p>
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Risks</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and track all risks</p>
        </div>
        <CreateRiskDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ['risks'] })} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Risk Object</Label>
              <Select value={targetFilter} onValueChange={(value) => { setTargetFilter(value); handleFilterChange(); }}>
                <SelectTrigger>
                  <SelectValue placeholder="All objects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All objects</SelectItem>
                  {objectsData?.map((obj) => (
                    <SelectItem key={obj.id} value={obj.id}>{obj.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Owner</Label>
              <Select value={ownerFilter} onValueChange={(value) => { setOwnerFilter(value); handleFilterChange(); }}>
                <SelectTrigger>
                  <SelectValue placeholder="All owners" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All owners</SelectItem>
                  {usersData?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Object</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Probability</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead className="w-[80px]">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {risks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-gray-500 dark:text-gray-400">
                      No risks found
                    </TableCell>
                  </TableRow>
                ) : (
                  risks.map((risk: Risk) => (
                    <TableRow key={risk.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => window.location.href = `/risks/${risk.id}`}>
                      <TableCell className="font-mono text-xs text-gray-500 dark:text-gray-400">
                        {risk.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="font-medium text-gray-900 dark:text-white">
                        {risk.title}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {risk.target?.name || risk.target_id}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {risk.owner?.full_name || risk.owner_id}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={cn('capitalize', statusColors[risk.status as keyof typeof statusColors] || '')}
                        >
                          {risk.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{risk.probability?.toLowerCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{risk.impact?.toLowerCase()}</Badge>
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
                        Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalCount)} of {totalCount} results
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
                          Page {page} of {totalPages || 1}
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