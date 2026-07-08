'use client';

import { useState, Fragment, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, AlertTriangle, X, Copy } from 'lucide-react';
import { reportService, userService } from '@/lib/api-services';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useLanguage } from '@/lib/language-context';
import { Autocomplete } from '@/components/ui/Autocomplete';
import { toast } from 'sonner';

const actionColors = {
  CREATE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
} as const;

const entityColors = {
  RISK: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  RISK_CAUSE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  RISK_CONSEQUENCE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  COUNTERMEASURE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  RISK_OBJECT: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  USER: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
} as const;

function diffJson(oldObj: Record<string, unknown> | undefined, newObj: Record<string, unknown> | undefined): Record<string, { old: unknown; new: unknown }> {
  if (!oldObj && !newObj) return {};
  const result: Record<string, { old: unknown; new: unknown }> = {};
  const a = oldObj || {};
  const b = newObj || {};
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of allKeys) {
    const av = a[key];
    const bv = b[key];
    if (JSON.stringify(av) !== JSON.stringify(bv)) {
      result[key] = { old: av, new: bv };
    }
  }
  return result;
}

function DiffView({ oldState, newState }: { oldState: any; newState: any }) {
  const changes = useMemo(() => diffJson(oldState, newState), [oldState, newState]);
  const entries = Object.entries(changes);
  if (entries.length === 0) {
    return <p className="text-sm text-gray-400">—</p>;
  }
  return (
    <div className="space-y-1 max-w-full overflow-hidden">
      {entries.map(([key, { old: ov, new: nv }]) => (
        <div key={key} className="flex flex-wrap gap-2 text-sm font-mono min-w-0">
          <span className="text-gray-500 font-semibold shrink-0">{key}:</span>
          <span className="text-red-500 line-through break-all min-w-0">{ov === null || ov === undefined ? '—' : String(typeof ov === 'object' ? JSON.stringify(ov) : ov)}</span>
          <span className="text-gray-400 shrink-0">→</span>
          <span className="text-green-600 break-all min-w-0">{nv === null || nv === undefined ? '—' : String(typeof nv === 'object' ? JSON.stringify(nv) : nv)}</span>
        </div>
      ))}
    </div>
  );
}

function AuditLogTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead><Skeleton className="h-4 w-32" /></TableHead>
          <TableHead><Skeleton className="h-4 w-40" /></TableHead>
          <TableHead><Skeleton className="h-4 w-24" /></TableHead>
          <TableHead><Skeleton className="h-4 w-40" /></TableHead>
          <TableHead><Skeleton className="h-4 w-48" /></TableHead>
          <TableHead className="w-[80px]"><Skeleton className="h-4 w-10" /></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(5)].map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
            <TableCell><Skeleton className="h-4 w-10" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function AdminLogsPage() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [userEmailFilter, setUserEmailFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.list().then(res => res.data),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs', page, limit, entityTypeFilter, actionFilter, userFilter, userEmailFilter, searchFilter, dateFrom, dateTo],
    queryFn: () => reportService.auditLogs({
      page,
      limit,
      entity_type: entityTypeFilter || undefined,
      action_type: actionFilter || undefined,
      user_id: userFilter || undefined,
      user_email: userEmailFilter || undefined,
      search: searchFilter || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }).then(res => res.data),
    placeholderData: (previousData) => previousData,
  });

  const toggleRow = (index: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const copyLog = (log: any) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    toast.success('Copied to clipboard');
  };

  const entityTypeOptions = [
    { value: '', label: t.admin.allTypes },
    { value: 'RISK', label: t.admin.risk },
    { value: 'RISK_CAUSE', label: `${t.admin.risk} (cause)` },
    { value: 'RISK_CONSEQUENCE', label: `${t.admin.risk} (consequence)` },
    { value: 'COUNTERMEASURE', label: t.admin.countermeasure },
                  { value: 'RISK_OBJECT', label: t.nav.objects },
    { value: 'USER', label: 'User' },
  ];

  const actionOptions = [
    { value: '', label: t.admin.allActions },
    { value: 'CREATE', label: t.admin.create },
    { value: 'UPDATE', label: t.admin.update },
    { value: 'DELETE', label: t.admin.deleteAction },
  ];

  const userOptions = [
    { value: '', label: t.admin.allUsers },
    ...(usersData || []).map((u: User) => ({ value: u.id, label: u.full_name, subtitle: u.email })),
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.admin.logsTitle}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t.admin.logsSubtitle}</p>
        </div>
        <Card>
          <CardContent className="pt-0">
            <AuditLogTableSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.admin.logsTitle}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t.admin.logsSubtitle}</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span>{t.common.error}: {error.message || 'Failed to load audit logs'}</span>
            </div>
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.admin.logsTitle}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{t.admin.logsSubtitle}</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.report.filters}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="xl:col-span-2">
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.common.search}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchFilter}
                  onChange={(e) => { setSearchFilter(e.target.value); setPage(1); }}
                  placeholder={t.admin.searchPlaceholder}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.admin.userEmail}</Label>
              <div className="relative">
                <Input
                  value={userEmailFilter}
                  onChange={(e) => { setUserEmailFilter(e.target.value); setPage(1); }}
                  placeholder="email"
                />
                {userEmailFilter && (
                  <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer" onClick={() => { setUserEmailFilter(''); setPage(1); }} />
                )}
              </div>
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.admin.user}</Label>
              <Autocomplete options={userOptions} value={userFilter} onChange={(v) => { setUserFilter(v); setPage(1); }} placeholder={t.admin.allUsers} clearable />
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.admin.entityType}</Label>
              <Autocomplete options={entityTypeOptions} value={entityTypeFilter} onChange={(v) => { setEntityTypeFilter(v); setPage(1); }} placeholder={t.admin.allTypes} clearable />
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.admin.action}</Label>
              <Autocomplete options={actionOptions} value={actionFilter} onChange={(v) => { setActionFilter(v); setPage(1); }} placeholder={t.admin.allActions} clearable />
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.report.dateFrom}</Label>
              <div className="relative">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-between font-normal', !dateFrom && 'text-muted-foreground')}>
                      {dateFrom || 'YYYY-MM-DD'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="single" selected={dateFrom ? parseISO(dateFrom) : undefined} onSelect={(date) => { if (date) { setDateFrom(format(date, 'yyyy-MM-dd')); setPage(1); } }} />
                  </PopoverContent>
                </Popover>
                {dateFrom && <X className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer" onClick={() => { setDateFrom(''); setPage(1); }} />}
              </div>
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.report.dateTo}</Label>
              <div className="relative">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-between font-normal', !dateTo && 'text-muted-foreground')}>
                      {dateTo || 'YYYY-MM-DD'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="single" selected={dateTo ? parseISO(dateTo) : undefined} onSelect={(date) => { if (date) { setDateTo(format(date, 'yyyy-MM-dd')); setPage(1); } }} />
                  </PopoverContent>
                </Popover>
                {dateTo && <X className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer" onClick={() => { setDateTo(''); setPage(1); }} />}
              </div>
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
                  <TableHead className="w-[160px]">{t.admin.timestamp}</TableHead>
                  <TableHead>{t.admin.user}</TableHead>
                  <TableHead>{t.admin.action}</TableHead>
                  <TableHead>{t.admin.target}</TableHead>
                  <TableHead className="max-w-[350px]">{t.admin.changes}</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-500 dark:text-gray-400">
                      {t.admin.noLogsFound}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log: any, index: number) => (
                    <Fragment key={log.id}>
                      <TableRow className={cn('hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer', expandedRows.has(index) && 'bg-muted/50')} onClick={() => toggleRow(index)}>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {format(new Date(log.timestamp), 'dd.MM.yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="min-w-[180px]">
                          <div className="text-sm text-gray-900 dark:text-white truncate">{log.changed_by_email || '—'}</div>
                          <div className="text-xs text-gray-400 font-mono truncate">{log.changed_by_user_id}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn(actionColors[log.action_type as keyof typeof actionColors] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400')}>
                            {log.action_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="min-w-[180px]">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={cn('shrink-0', entityColors[log.entity_type as keyof typeof entityColors] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400')}>
                              {log.entity_type}
                            </Badge>
                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{log.entity_name || '—'}</span>
                          </div>
                          <div className="text-xs text-gray-400 font-mono truncate">{log.entity_id}</div>
                        </TableCell>
                        <TableCell className="max-w-[350px]">
                          <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all block">
                            {log.changes ? log.changes : '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 h-7 w-7" onClick={() => copyLog(log)}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 h-7 w-7" onClick={() => toggleRow(index)}>
                              {expandedRows.has(index) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(index) && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-0">
                            <div className="px-6 pb-4 bg-muted/50 border-t border-border space-y-4 max-w-full overflow-hidden">
                              {/* Diff view */}
                              {(log.old_state || log.new_state) && (
                                <div>
                                  <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400 mb-2">Разница (diff)</h4>
                                  <DiffView oldState={log.old_state} newState={log.new_state} />
                                </div>
                              )}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                                <div className="min-w-0">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400">{t.admin.oldState}</h4>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-600" onClick={() => { navigator.clipboard.writeText(JSON.stringify(log.old_state, null, 2)); toast.success(t.common.copiedToClipboard); }}>
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                   <pre className="text-xs bg-background p-3 rounded border border-border whitespace-pre-wrap break-all font-mono block max-w-full">
                                     {log.old_state ? JSON.stringify(log.old_state, null, 2) : '—'}
                                   </pre>
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400">{t.admin.newState}</h4>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-600" onClick={() => { navigator.clipboard.writeText(JSON.stringify(log.new_state, null, 2)); toast.success(t.common.copiedToClipboard); }}>
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                   <pre className="text-xs bg-background p-3 rounded border border-border whitespace-pre-wrap break-all font-mono block max-w-full">
                                     {log.new_state ? JSON.stringify(log.new_state, null, 2) : '—'}
                                   </pre>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={6} className="py-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t.common.showingXtoYofZ
                          .replace('{from}', String(((page - 1) * limit) + 1))
                          .replace('{to}', String(Math.min(page * limit, totalCount)))
                          .replace('{total}', String(totalCount))}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {t.common.pageXofY
                            .replace('{current}', String(page))
                            .replace('{total}', String(totalPages || 1))}
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
