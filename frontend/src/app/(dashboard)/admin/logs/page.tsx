'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Download, Copy, Loader2, ChevronLeft, ChevronRight, FileText, Clock, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { reportService } from '@/lib/api-services';
import { riskObjectService } from '@/lib/api-services';
import { userService } from '@/lib/api-services';
import type { RiskObject, User } from '@/types/api';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const actionColors = {
  CREATE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
} as const;

const entityColors = {
  RISK: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  COUNTERMEASURE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
} as const;

function AuditLogTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead><Skeleton className="h-4 w-20" /></TableHead>
          <TableHead><Skeleton className="h-4 w-16" /></TableHead>
          <TableHead><Skeleton className="h-4 w-20" /></TableHead>
          <TableHead><Skeleton className="h-4 w-24" /></TableHead>
          <TableHead><Skeleton className="h-4 w-24" /></TableHead>
          <TableHead className="w-[300px]"><Skeleton className="h-4 w-40" /></TableHead>
          <TableHead className="w-[300px]"><Skeleton className="h-4 w-40" /></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(5)].map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function AdminLogsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.list().then(res => res.data),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', page, limit, entityTypeFilter, actionFilter, userFilter, dateFrom, dateTo],
    queryFn: () => reportService.auditLogs({ page, limit, entity_type: entityTypeFilter || undefined, action_type: actionFilter || undefined, user_id: userFilter || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined }).then(res => res.data),
    placeholderData: (previousData) => previousData,
  });

  const handleExport = () => {
    if (!data?.items) return;
    
    const headers = ['ID', 'Entity Type', 'Entity ID', 'Action', 'User', 'Timestamp', 'Old State', 'New State'];
    const rows = data.items.map((item, index) => [
      item.id.toString(),
      item.entity_type,
      item.entity_id,
      item.action_type,
      item.changed_by_user_id,
      new Date(item.timestamp).toLocaleString(),
      item.old_state ? JSON.stringify(item.old_state) : '',
      item.new_state ? JSON.stringify(item.new_state) : '',
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success(`Exported ${data.items.length} rows`);
  };

  const handleCopy = () => {
    if (!data?.items) return;
    
    const headers = ['ID', 'Entity Type', 'Entity ID', 'Action', 'User', 'Timestamp', 'Old State', 'New State'];
    const rows = data.items.map((item) => [
      item.id.toString(),
      item.entity_type,
      item.entity_id,
      item.action_type,
      item.changed_by_user_id,
      new Date(item.timestamp).toLocaleString(),
      item.old_state ? JSON.stringify(item.old_state) : '',
      item.new_state ? JSON.stringify(item.new_state) : '',
    ]);
    
    const tsvContent = [headers, ...rows].map(row => row.join('\t')).join('\n');
    navigator.clipboard.writeText(tsvContent);
    toast.success(`Copied ${data.items.length} rows to clipboard`);
  };

  const toggleRow = (index: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">View all system changes and audit trail</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-0">
            <AuditLogTableSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  const logs = data?.items || [];
  const totalCount = data?.total_count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">View all system changes and audit trail</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCopy} disabled={logs.length === 0}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button onClick={handleExport} disabled={logs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[150px]">
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entity Type</Label>
              <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="RISK">Risk</SelectItem>
                  <SelectItem value="COUNTERMEASURE">Countermeasure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All users</SelectItem>
                  {usersData?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.full_name} ({user.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Input readOnly placeholder="Select date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
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
            <div className="flex-1 min-w-[150px]">
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Input readOnly placeholder="Select date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
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

      {/* Table */}
      <Card>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead>ID</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead className="w-[300px]">Old State</TableHead>
                  <TableHead className="w-[300px]">New State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-500 dark:text-gray-400">
                      No audit logs found matching the filters
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log, index) => (
                    <>
                      <TableRow key={log.id} className={cn('hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer', expandedRows.has(index) && 'bg-muted/50')} onClick={() => toggleRow(index)}>
                        <TableCell className="font-mono text-xs text-gray-500 dark:text-gray-400">{log.id}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn(entityColors[log.entity_type as keyof typeof entityColors] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400')}>
                            {log.entity_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn(actionColors[log.action_type as keyof typeof actionColors] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400')}>
                            {log.action_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">{log.changed_by_user_id}</TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">{new Date(log.timestamp).toLocaleString()}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700" onClick={(e) => { e.stopPropagation(); toggleRow(index); }}>
                            {expandedRows.has(index) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700" onClick={(e) => { e.stopPropagation(); toggleRow(index); }}>
                            {expandedRows.has(index) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(index) && (
                        <TableRow>
                          <TableCell colSpan={7} className="py-0">
                            <div className="px-6 pb-4 bg-muted/50 border-t border-border">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400 mb-2">Old State</h4>
                                  <pre className="text-xs bg-background p-3 rounded border border-border max-h-64 overflow-auto whitespace-pre-wrap font-mono">
                                    {log.old_state ? JSON.stringify(log.old_state, null, 2) : '—'}
                                  </pre>
                                </div>
                                <div>
                                  <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400 mb-2">New State</h4>
                                  <pre className="text-xs bg-background p-3 rounded border border-border max-h-64 overflow-auto whitespace-pre-wrap font-mono">
                                    {log.new_state ? JSON.stringify(log.new_state, null, 2) : '—'}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
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
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Page {page} of {totalPages || 1}
                        </span>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}>
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