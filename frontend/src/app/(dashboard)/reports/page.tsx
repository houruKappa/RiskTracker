'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Search, Download, Copy, Loader2, AlertTriangle, FileText, Clock, TrendingUp, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { reportService } from '@/lib/api-services';
import { riskObjectService } from '@/lib/api-services';
import { userService } from '@/lib/api-services';
import type { ReportSummary, PaginatedReport, RiskObject, User } from '@/types/api';
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { RiskEditSheet } from '@/components/risk/RiskDrawer';

const statusColors = {
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
} as const;

function ReportTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead><Skeleton className="h-4 w-32" /></TableHead>
          <TableHead><Skeleton className="h-4 w-24" /></TableHead>
          <TableHead><Skeleton className="h-4 w-24" /></TableHead>
          <TableHead><Skeleton className="h-4 w-20" /></TableHead>
          <TableHead><Skeleton className="h-4 w-32" /></TableHead>
          <TableHead><Skeleton className="h-4 w-24" /></TableHead>
          <TableHead className="w-[100px]"><Skeleton className="h-4 w-20" /></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(5)].map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function ReportsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [targetFilter, setTargetFilter] = useState<string>('');
  const [ownerFilter, setOwnerFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedRisk, setSelectedRisk] = useState<string | null>(null);

  const { data: objectsData } = useQuery({
    queryKey: ['risk-objects'],
    queryFn: () => riskObjectService.list().then(res => res.data),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.list().then(res => res.data),
  });

  const { data: summaryData } = useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => reportService.summary().then(res => res.data),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports', 'detail', page, limit, targetFilter, ownerFilter, statusFilter, dateFrom, dateTo],
    queryFn: () => reportService.detail({ page, limit, target_id: targetFilter || undefined, owner_id: ownerFilter || undefined, status: statusFilter || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined }).then(res => res.data),
    placeholderData: (previousData) => previousData,
  });

  const handleExport = () => {
    if (!data?.items) return;
    
    const headers = ['Risk Title', 'Object', 'Owner', 'Status', 'Countermeasures', 'Assignees', 'Created'];
    const rows = data.items.map(item => {
      const countermeasures = item.countermeasures?.map(cm => `${cm.description} (${cm.deadline ? new Date(cm.deadline).toLocaleDateString() : 'No deadline'})`).join('; ') || 'None';
      const assignees = item.countermeasures?.map(cm => cm.assignee_name).filter(Boolean).join(', ') || 'None';
      return [
        item.title,
        item.target_name,
        item.owner_name,
        item.status,
        countermeasures,
        assignees,
        new Date(item.created_at).toLocaleDateString()
      ];
    });
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `risk-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success(`Exported ${data.items.length} rows`);
  };

  const handleCopy = () => {
    if (!data?.items) return;
    
    const headers = ['Risk Title', 'Object', 'Owner', 'Status', 'Countermeasures', 'Assignees', 'Created'];
    const rows = data.items.map(item => {
      const countermeasures = item.countermeasures?.map(cm => `${cm.description} (${cm.deadline ? new Date(cm.deadline).toLocaleDateString() : 'No deadline'})`).join('; ') || 'None';
      const assignees = item.countermeasures?.map(cm => cm.assignee_name).filter(Boolean).join(', ') || 'None';
      return [
        item.title,
        item.target_name,
        item.owner_name,
        item.status,
        countermeasures,
        assignees,
        new Date(item.created_at).toLocaleDateString()
      ];
    });
    
    const tsvContent = [headers, ...rows].map(row => row.join('\t')).join('\n');
    navigator.clipboard.writeText(tsvContent);
    toast.success(`Copied ${data.items.length} rows to clipboard`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Detailed risk analytics and export</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-0">
            <ReportTableSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  const report = data;
  const items = report?.items || [];
  const totalCount = report?.total_count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <>
      <RiskEditSheet riskId={selectedRisk} onClose={() => setSelectedRisk(null)} />
      <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Detailed risk analytics and export</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCopy} disabled={items.length === 0}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button onClick={handleExport} disabled={items.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summaryData && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title="Total Risks" value={summaryData.total_risks} icon={FileText} color="bg-blue-500" trend={`${summaryData.in_progress_risks} in progress`} />
          <StatCard title="In Progress" value={summaryData.in_progress_risks} icon={Clock} color="bg-yellow-500" trend={`${summaryData.completed_risks} completed`} />
          <StatCard title="Expired Countermeasures" value={summaryData.expired_countermeasures} icon={AlertTriangle} color="bg-red-500" trend="Require attention" />
          <StatCard title="Expiring Soon (7 days)" value={summaryData.expiring_soon_countermeasures} icon={TrendingUp} color="bg-orange-500" trend="Plan actions" />
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[180px]">
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Risk Object</Label>
              <Select value={targetFilter} onValueChange={setTargetFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All objects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All objects</SelectItem>
                  {objectsData?.map((obj) => (
                    <SelectItem key={obj.id} value={obj.id}>{obj.name} ({obj.object_type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Owner</Label>
              <Select value={ownerFilter} onValueChange={setOwnerFilter}>
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
            <div className="flex-1 min-w-[180px]">
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
            <div className="flex-1 min-w-[180px]">
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Input
                    readOnly
                    placeholder="Select date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateFrom ? parseISO(dateFrom) : undefined}
                    onSelect={(date) => date && setDateFrom(format(date, 'yyyy-MM-dd'))}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 min-w-[180px]">
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Input
                    readOnly
                    placeholder="Select date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateTo ? parseISO(dateTo) : undefined}
                    onSelect={(date) => date && setDateTo(format(date, 'yyyy-MM-dd'))}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button variant="outline" onClick={() => { setPage(1); refetch(); }}>
              <Search className="h-4 w-4 mr-2" />
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-red-500"></span>
          <span>Expired countermeasure deadline</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-yellow-500"></span>
          <span>Expiring within 3 days</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-green-500"></span>
          <span>Active ({">"} 7 days)</span>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead>Risk Title</TableHead>
                  <TableHead>Object</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Countermeasures</TableHead>
                  <TableHead>Assignees</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-500 dark:text-gray-400">
                      No risks found matching the filters
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item: PaginatedReport['items'][0]) => {
                    const hasExpired = item.countermeasures?.some(cm => cm.is_expired) || false;
                    const hasExpiringSoon = item.countermeasures?.some(cm => cm.is_expiring_soon) || false;
                    const rowClass = hasExpired ? 'bg-red-50 dark:bg-red-900/10' : hasExpiringSoon ? 'bg-yellow-50 dark:bg-yellow-900/10' : '';
                    
                    return (
                      <TableRow key={item.id} className={cn('hover:bg-gray-50 dark:hover:bg-gray-800/50', rowClass)}>
                        <TableCell className="font-medium text-gray-900 dark:text-white max-w-xs truncate" title={item.title}>
                          {item.title}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{item.target_name}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{item.owner_name}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn('capitalize', statusColors[item.status as keyof typeof statusColors] || '')}>
                            {item.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          {item.countermeasures?.length === 0 ? (
                            <span className="text-gray-500 dark:text-gray-400">No countermeasures</span>
                          ) : (
                            <ul className="space-y-1 text-sm">
                              {item.countermeasures?.map((cm) => {
                                const deadline = cm.deadline ? new Date(cm.deadline) : null;
                                const isExpired = deadline && deadline < new Date();
                                const isExpiringSoon = deadline && deadline >= new Date() && deadline <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                                
                                let badgeColor = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
                                if (isExpired) badgeColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
                                else if (isExpiringSoon) badgeColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
                                
                                return (
                                  <li key={cm.id} className="flex items-center gap-2">
                                    <span className="flex-1 truncate">{cm.description}</span>
                                    {deadline && (
                                      <Badge variant="secondary" className={cn(badgeColor, 'text-xs')}>
                                        {format(deadline, 'MMM d, yyyy')}
                                      </Badge>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.countermeasures?.length === 0 ? (
                            <span className="text-gray-500 dark:text-gray-400">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {item.countermeasures?.map((cm) => (
                                <Badge key={cm.id} variant="outline" className="text-xs">
                                  {cm.assignee_name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedRisk(item.id)}
                            className="text-blue-600 hover:text-blue-700"
                            aria-label="Quick edit"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={7} className="py-4">
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
  </>
);
}