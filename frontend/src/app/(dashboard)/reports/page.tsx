'use client';

import { useState, Fragment, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Download, Copy, AlertTriangle, FileText, Clock, TrendingUp, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X } from 'lucide-react';
import { reportService, riskObjectService, userService } from '@/lib/api-services';
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
import { useLanguage } from '@/lib/language-context';
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

function ReportTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40px]"></TableHead>
          <TableHead><Skeleton className="h-4 w-32" /></TableHead>
          <TableHead><Skeleton className="h-4 w-24" /></TableHead>
          <TableHead><Skeleton className="h-4 w-24" /></TableHead>
          <TableHead><Skeleton className="h-4 w-20" /></TableHead>
          <TableHead><Skeleton className="h-4 w-20" /></TableHead>
          <TableHead><Skeleton className="h-4 w-20" /></TableHead>
          <TableHead className="w-[100px]"><Skeleton className="h-4 w-20" /></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(5)].map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-4" /></TableCell>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function ReportsPage() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [targetFilter, setTargetFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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

  const { data: summaryData } = useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => reportService.summary().then(res => res.data),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports', 'detail', page, limit, targetFilter, ownerFilter, statusFilter, dateFrom, dateTo, search],
    queryFn: () => reportService.detail({
      page,
      limit,
      target_id: targetFilter || undefined,
      owner_id: ownerFilter || undefined,
      status: statusFilter || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      search: search || undefined,
    }).then(res => res.data),
    placeholderData: (previousData) => previousData,
  });

  const toggleRow = useCallback((id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleFilterChange = useCallback((setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  }, []);

  const handleExport = () => {
    if (!data?.items) return;
    const headers = ['Risk Title', 'Object', 'Owner', 'Status', 'Probability', 'Impact', 'Countermeasures', 'Assignees', 'Created'];
    const rows = data.items.map(item => {
      const countermeasures = item.countermeasures?.map(cm => `${cm.description} (${cm.deadline ? new Date(cm.deadline).toLocaleDateString() : 'No deadline'})`).join('; ') || 'None';
      const assignees = item.countermeasures?.map(cm => cm.assignee_name).filter(Boolean).join(', ') || 'None';
      return [
        item.title,
        item.target_name,
        item.owner_name,
        item.status,
        item.probability,
        item.impact,
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
    const headers = ['Risk Title', 'Object', 'Owner', 'Status', 'Probability', 'Impact', 'Countermeasures', 'Assignees', 'Created'];
    const rows = data.items.map(item => {
      const countermeasures = item.countermeasures?.map(cm => `${cm.description} (${cm.deadline ? new Date(cm.deadline).toLocaleDateString() : 'No deadline'})`).join('; ') || 'None';
      const assignees = item.countermeasures?.map(cm => cm.assignee_name).filter(Boolean).join(', ') || 'None';
      return [
        item.title,
        item.target_name,
        item.owner_name,
        item.status,
        item.probability,
        item.impact,
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.report.title}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{t.report.subtitle}</p>
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

  const items = data?.items || [];
  const totalCount = data?.total_count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <>
      <RiskEditSheet riskId={selectedRisk} onClose={() => setSelectedRisk(null)} />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.report.title}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{t.report.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={handleCopy} disabled={items.length === 0}>
              <Copy className="h-4 w-4 mr-2" />
              {t.common.copy}
            </Button>
            <Button onClick={handleExport} disabled={items.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              {t.common.exportCsv}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summaryData && (
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard title={t.report.totalRisks} value={summaryData.total_risks} icon={FileText} color="bg-blue-500" trend={`${summaryData.in_progress_risks} ${t.report.inProgress.toLowerCase()}`} />
            <StatCard title={t.report.inProgress} value={summaryData.in_progress_risks} icon={Clock} color="bg-yellow-500" trend={`${summaryData.completed_risks} ${t.report.completed.toLowerCase()}`} />
            <StatCard title={t.report.expiredCountermeasures} value={summaryData.expired_countermeasures} icon={AlertTriangle} color="bg-red-500" trend={t.common.noData} />
            <StatCard title={t.report.expiringSoon7Days} value={summaryData.expiring_soon_countermeasures} icon={TrendingUp} color="bg-orange-500" trend={t.common.noData} />
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.report.filters}</CardTitle>
          </CardHeader>
          <CardContent>
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
              <div className="flex-1 min-w-[180px]">
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.report.riskObjectLabel}</Label>
                <Autocomplete
                  clearable
                  options={objects.map(o => ({ value: o.id, label: o.name, subtitle: o.object_type }))}
                  value={targetFilter}
                  onChange={handleFilterChange(setTargetFilter)}
                  placeholder={t.report.allObjects}
                  emptyMessage={t.common.none}
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.report.ownerLabel}</Label>
                <Autocomplete
                  clearable
                  options={users.map(u => ({ value: u.id, label: u.full_name, subtitle: u.email }))}
                  value={ownerFilter}
                  onChange={handleFilterChange(setOwnerFilter)}
                  placeholder={t.report.allOwners}
                  emptyMessage={t.common.none}
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.report.statusLabel}</Label>
                <Autocomplete
                  clearable
                  options={[
                    { value: 'IN_PROGRESS', label: t.risk.inProgress },
                    { value: 'COMPLETED', label: t.risk.completed },
                  ]}
                  value={statusFilter}
                  onChange={handleFilterChange(setStatusFilter)}
                  placeholder={t.report.allStatuses}
                  emptyMessage={t.common.none}
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.report.dateFrom}</Label>
                <div className="relative">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Input
                        readOnly
                        placeholder="YYYY-MM-DD"
                        value={dateFrom}
                        className="pr-8 cursor-pointer"
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateFrom ? parseISO(dateFrom) : undefined}
                        onSelect={(date) => { if (date) { setDateFrom(format(date, 'yyyy-MM-dd')); setPage(1); } }}
                      />
                    </PopoverContent>
                  </Popover>
                  {dateFrom && (
                    <X
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer"
                      onClick={() => { setDateFrom(''); setPage(1); }}
                    />
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-[180px]">
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.report.dateTo}</Label>
                <div className="relative">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Input
                        readOnly
                        placeholder="YYYY-MM-DD"
                        value={dateTo}
                        className="pr-8 cursor-pointer"
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateTo ? parseISO(dateTo) : undefined}
                        onSelect={(date) => { if (date) { setDateTo(format(date, 'yyyy-MM-dd')); setPage(1); } }}
                      />
                    </PopoverContent>
                  </Popover>
                  {dateTo && (
                    <X
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer"
                      onClick={() => { setDateTo(''); setPage(1); }}
                    />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-red-500"></span>
            <span>{t.report.expiredDeadline}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-yellow-500"></span>
            <span>{t.report.expiringWithin3Days}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-green-500"></span>
            <span>{t.report.activeGt7Days}</span>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border">
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>{t.report.riskTitle}</TableHead>
                    <TableHead>{t.report.object}</TableHead>
                    <TableHead>{t.report.owner}</TableHead>
                    <TableHead>{t.risk.status}</TableHead>
                    <TableHead>{t.risk.probability}</TableHead>
                    <TableHead>{t.risk.impact}</TableHead>
                    <TableHead className="w-[100px]">{t.report.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-gray-500 dark:text-gray-400">
                        {t.report.noRisksFound}
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item: PaginatedReport['items'][0]) => {
                      const hasExpired = item.countermeasures?.some(cm => cm.is_expired) || false;
                      const hasExpiringSoon = item.countermeasures?.some(cm => cm.is_expiring_soon) || false;
                      const rowClass = hasExpired ? 'bg-red-50 dark:bg-red-900/10' : hasExpiringSoon ? 'bg-yellow-50 dark:bg-yellow-900/10' : '';
                      const isExpanded = expandedRows.has(item.id);

                      return (
                        <Fragment key={item.id}>
                          <TableRow className={cn('hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer', rowClass)} onClick={() => toggleRow(item.id)}>
                            <TableCell>
                              <button className="p-1 hover:bg-pink-100 rounded transition-colors">
                                {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                              </button>
                            </TableCell>
                            <TableCell className="font-medium text-gray-900 dark:text-white max-w-xs truncate" title={item.title}>
                              {item.title}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-600 dark:text-gray-400 max-w-[150px] truncate block">{item.target_name}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-600 dark:text-gray-400 max-w-[150px] truncate block">{item.owner_name}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={cn('capitalize', statusColors[item.status as keyof typeof statusColors] || '')}>
                                {item.status === 'IN_PROGRESS' ? t.risk.inProgress : t.risk.completed}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={cn('capitalize', levelColors[item.probability as keyof typeof levelColors] || '')}>
                                {item.probability}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={cn('capitalize', levelColors[item.impact as keyof typeof levelColors] || '')}>
                                {item.impact}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); setSelectedRisk(item.id); }}
                                className="text-pink-600 hover:text-pink-700 hover:bg-pink-50"
                                aria-label={t.risk.editRisk}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`${item.id}-expanded`}>
                              <TableCell colSpan={8} className="bg-pink-50/30 border-t-0">
                                <div className="p-4 space-y-4">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <span className="text-gray-500 font-medium">{t.risk.maxCauseProbability}:</span>
                                      <Badge variant="secondary" className={cn('ml-2 capitalize', levelColors[item.max_cause_probability as keyof typeof levelColors] || '')}>
                                        {item.max_cause_probability || 'N/A'}
                                      </Badge>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 font-medium">{t.risk.maxConsequenceProbability}:</span>
                                      <Badge variant="secondary" className={cn('ml-2 capitalize', levelColors[item.max_consequence_probability as keyof typeof levelColors] || '')}>
                                        {item.max_consequence_probability || 'N/A'}
                                      </Badge>
                                    </div>
                                  </div>

                                  {item.countermeasures && item.countermeasures.length > 0 && (
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-900 mb-2">{t.risk.countermeasures}</h4>
                                      <div className="space-y-2">
                                        {item.countermeasures.map((cm) => {
                                          const deadline = cm.deadline ? new Date(cm.deadline) : null;
                                          const isExpired = deadline && deadline < new Date();
                                          const isExpiringSoon = deadline && deadline >= new Date() && deadline <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

                                          let badgeColor = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
                                          if (isExpired) badgeColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
                                          else if (isExpiringSoon) badgeColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';

                                          return (
                                            <div key={cm.id} className="flex items-center gap-3 p-2 bg-white/60 rounded-lg border border-pink-100 min-w-0">
                                              <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{cm.description}</span>
                                              <span className="text-xs text-gray-500 shrink-0 whitespace-nowrap">{t.risk.assignee}: {cm.assignee_name}</span>
                                              {deadline && (
                                                <Badge variant="secondary" className={cn(badgeColor, 'text-xs')}>
                                                  {format(deadline, 'MMM d, yyyy')}
                                                </Badge>
                                              )}
                                              <Badge variant="outline" className="text-xs capitalize">
                                                {cm.target_type === 'CAUSE' ? t.risk.causes : t.risk.consequences}
                                              </Badge>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })
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
    </>
  );
}
