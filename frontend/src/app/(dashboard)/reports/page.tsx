'use client';

import { useState, Fragment, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Download, FileText, Clock, TrendingUp, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X, AlertTriangle, CheckSquare, Square, Trash2 } from 'lucide-react';
import { reportService, riskObjectService, userService } from '@/lib/api-services';
import type { ReportSummary, PaginatedReport, RiskObject, User, ReportStatistics, OverdueCountermeasure } from '@/types/api';
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
import { DonutChart, DonutLegend } from '@/components/ui/DonutChart';

const statusColors = {
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
} as const;

const cmStatusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
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
          <TableHead className="w-[40px]"><Skeleton className="h-4 w-4" /></TableHead>
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
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRisks, setSelectedRisks] = useState<Set<string>>(new Set());
  const [reportForIds, setReportForIds] = useState<string[]>([]);

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
    queryKey: ['reports', 'detail', page, limit, targetFilter, ownerFilter, assigneeFilter, statusFilter, dateFrom, dateTo, search, reportForIds],
    queryFn: () => reportService.detail({
      page,
      limit,
      target_id: targetFilter || undefined,
      owner_id: ownerFilter || undefined,
      assignee_id: assigneeFilter || undefined,
      risk_ids: reportForIds.length > 0 ? reportForIds.join(',') : undefined,
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
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedRisks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const items = data?.items || [];
    setSelectedRisks(prev => {
      if (items.every(it => prev.has(it.id))) {
        const next = new Set(prev);
        items.forEach(it => next.delete(it.id));
        return next;
      } else {
        const next = new Set(prev);
        items.forEach(it => next.add(it.id));
        return next;
      }
    });
  }, [data]);

  const handleFilterChange = useCallback((setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
    setReportForIds([]);
  }, []);

  const selectMode = reportForIds.length > 0;
  const stats: ReportStatistics | undefined = data?.statistics;
  const overdueDetails: OverdueCountermeasure[] = stats?.overdue_details || [];

  const handleExport = () => {
    const items = data?.items || [];
    if (!items.length) return;

    const scopeLabel = selectMode
      ? `Selected ${reportForIds.length} risks`
      : assigneeFilter
        ? `Assignee: ${data?.report_for_name || assigneeFilter}`
        : ownerFilter
          ? `Owner: ${data?.report_for_name || ownerFilter}`
          : 'All risks';

    const lines: string[] = [];
    lines.push('RISK REPORT');
    lines.push(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`);
    lines.push(`Scope: ${scopeLabel}`);
    lines.push('');
    lines.push('=== STATISTICS ===');
    if (stats) {
      lines.push(`Total Risks,${stats.risks_total}`);
      lines.push(`In Progress,${stats.risks_in_progress}`);
      lines.push(`Completed,${stats.risks_completed}`);
      lines.push(`Total Countermeasures,${stats.countermeasures_total}`);
      lines.push(`Completed,${stats.countermeasures_completed}`);
      lines.push(`Pending,${stats.countermeasures_pending}`);
      lines.push(`Overdue,${stats.countermeasures_overdue}`);
      if (overdueDetails.length > 0) {
        lines.push('');
        lines.push('--- Overdue Countermeasures ---');
        overdueDetails.forEach(d => {
          lines.push(`"${d.risk_title}","${d.description}","${d.assignee_name}","${d.deadline ? format(new Date(d.deadline), 'yyyy-MM-dd') : ''}"`);
        });
      }
    }
    lines.push('');
    lines.push('=== DETAILS ===');
    const header = ['Risk Title', 'Object', 'Owner', 'Status', 'Probability', 'Impact', 'CM Count', 'Overdue CMs', 'Created'];
    lines.push(header.join(','));
    items.forEach(item => {
      const cms = item.countermeasures || [];
      const overdue = cms.filter(cm => cm.status === 'PENDING' && cm.is_expired);
      lines.push([
        `"${item.title}"`,
        `"${item.target_name}"`,
        `"${item.owner_name}"`,
        item.status,
        item.probability,
        item.impact,
        cms.length,
        overdue.length,
        format(new Date(item.created_at), 'yyyy-MM-dd'),
      ].join(','));
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `risk-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success(`Exported ${items.length} rows`);
  };

  // Chart data
  const riskChartSegments = useMemo(() => {
    if (!summaryData) return [];
    return [
      { value: summaryData.in_progress_risks, color: '#f59e0b', label: t.risk.inProgress },
      { value: summaryData.completed_risks, color: '#22c55e', label: t.risk.completed },
    ];
  }, [summaryData, t]);

  const cmChartSegments = useMemo(() => {
    if (!summaryData) return [];
    const segs = [];
    if (summaryData.completed_countermeasures > 0) segs.push({ value: summaryData.completed_countermeasures, color: '#22c55e', label: 'Completed' });
    if (summaryData.pending_countermeasures > 0) segs.push({ value: summaryData.pending_countermeasures, color: '#eab308', label: 'Pending' });
    return segs;
  }, [summaryData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.report.title}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{t.report.subtitle}</p>
          </div>
        </div>
        <Card><CardContent className="pt-0"><ReportTableSkeleton /></CardContent></Card>
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
            <Button onClick={handleExport} disabled={items.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              {t.common.exportCsv}
            </Button>
          </div>
        </div>

        {/* Summary with donuts */}
        {summaryData && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-4">
                <StatCard title={t.report.totalRisks} value={summaryData.total_risks} icon={FileText} color="bg-blue-500" trend={t.report.riskTitle} />
                <StatCard title={t.report.inProgress} value={summaryData.in_progress_risks} icon={Clock} color="bg-yellow-500" trend={`${summaryData.completed_risks} ${t.report.completed.toLowerCase()}`} />
                <StatCard title={t.report.expiredCountermeasures} value={summaryData.overdue_countermeasures} icon={AlertTriangle} color="bg-red-500" trend={`${summaryData.total_countermeasures} total`} />
                <StatCard title={t.report.expiringSoon7Days} value={summaryData.expiring_soon_countermeasures} icon={TrendingUp} color="bg-orange-500" trend={`${summaryData.pending_countermeasures} pending`} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-8">
                <div className="flex items-center gap-3">
                  <DonutChart segments={riskChartSegments} size={72} strokeWidth={10} />
                  <DonutLegend segments={riskChartSegments} />
                </div>
                <div className="flex items-center gap-3">
                  <DonutChart segments={cmChartSegments} size={72} strokeWidth={10} />
                  <DonutLegend segments={cmChartSegments} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                  <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); setReportForIds([]); }} placeholder={t.admin.searchPlaceholder} className="pl-9" />
                  {search && <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer" onClick={() => { setSearch(''); setPage(1); }} />}
                </div>
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.report.riskObjectLabel}</Label>
                <Autocomplete clearable showAllOption allLabel={t.report.allObjects} options={objects.map(o => ({ value: o.id, label: o.name, subtitle: o.object_type }))} value={targetFilter} onChange={handleFilterChange(setTargetFilter)} placeholder={t.report.allObjects} emptyMessage={t.common.none} />
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.report.ownerLabel}</Label>
                <Autocomplete clearable showAllOption allLabel={t.report.allOwners} options={users.map(u => ({ value: u.id, label: u.full_name, subtitle: u.email }))} value={ownerFilter} onChange={handleFilterChange(setOwnerFilter)} placeholder={t.report.allOwners} emptyMessage={t.common.none} />
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.report.assigneeLabel}</Label>
                <Autocomplete clearable showAllOption allLabel={t.report.allAssignees} options={users.map(u => ({ value: u.id, label: u.full_name, subtitle: u.email }))} value={assigneeFilter} onChange={handleFilterChange(setAssigneeFilter)} placeholder={t.report.allAssignees} emptyMessage={t.common.none} />
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.report.statusLabel}</Label>
                <Autocomplete clearable showAllOption allLabel={t.report.allStatuses} options={[{ value: 'IN_PROGRESS', label: t.risk.inProgress }, { value: 'COMPLETED', label: t.risk.completed }]} value={statusFilter} onChange={handleFilterChange(setStatusFilter)} placeholder={t.report.allStatuses} emptyMessage={t.common.none} />
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.report.dateFrom}</Label>
                <div className="relative">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Input readOnly placeholder="YYYY-MM-DD" value={dateFrom} className="pr-8 cursor-pointer" />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent mode="single" selected={dateFrom ? parseISO(dateFrom) : undefined} onSelect={(date) => { if (date) { setDateFrom(format(date, 'yyyy-MM-dd')); setPage(1); } }} />
                    </PopoverContent>
                  </Popover>
                  {dateFrom && <X className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer" onClick={() => { setDateFrom(''); setPage(1); }} />}
                </div>
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.report.dateTo}</Label>
                <div className="relative">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Input readOnly placeholder="YYYY-MM-DD" value={dateTo} className="pr-8 cursor-pointer" />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent mode="single" selected={dateTo ? parseISO(dateTo) : undefined} onSelect={(date) => { if (date) { setDateTo(format(date, 'yyyy-MM-dd')); setPage(1); } }} />
                    </PopoverContent>
                  </Popover>
                  {dateTo && <X className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer" onClick={() => { setDateTo(''); setPage(1); }} />}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selection banner */}
        {selectedRisks.size > 0 && (
          <div className="flex items-center justify-between bg-pink-50 border border-pink-200 rounded-lg px-4 py-3">
            <span className="text-sm text-gray-700">{t.report.selectedRisks}: {selectedRisks.size}</span>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { setReportForIds(Array.from(selectedRisks)); setPage(1); }}>
                {t.report.reportForSelected}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setSelectedRisks(new Set()); setReportForIds([]); }}>
                <Trash2 className="h-4 w-4 mr-1" /> {t.common.clear}
              </Button>
            </div>
          </div>
        )}

        {selectMode && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <span className="text-sm text-gray-700">{t.report.selectionMode} ({reportForIds.length})</span>
            <Button size="sm" variant="outline" onClick={() => { setReportForIds([]); setSelectedRisks(new Set()); setPage(1); }}>
              {t.report.exitSelectionMode}
            </Button>
          </div>
        )}

        {/* Statistics panel (when filtered or selection) */}
        {stats && (ownerFilter || assigneeFilter || selectMode) && (
          <Card className="border-pink-200/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-pink-500" />
                {data?.report_for_name ? `${t.report.reportFor}: ${data.report_for_name}` : t.report.statistics}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <StatCard title={t.report.riskTitle} value={stats.risks_total} icon={FileText} color="bg-blue-500" />
                <StatCard title={t.risk.inProgress} value={stats.risks_in_progress} icon={Clock} color="bg-yellow-500" />
                <StatCard title={t.risk.completed} value={stats.risks_completed} icon={CheckSquare} color="bg-green-500" />
                <StatCard title={t.report.totalCms} value={stats.countermeasures_total} icon={TrendingUp} color="bg-purple-500" />
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/10">
                  <p className="text-2xl font-bold text-green-600">{stats.countermeasures_completed}</p>
                  <p className="text-xs text-gray-500">{t.report.cmCompleted}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/10">
                  <p className="text-2xl font-bold text-yellow-600">{stats.countermeasures_pending}</p>
                  <p className="text-xs text-gray-500">{t.report.cmPending}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/10">
                  <p className="text-2xl font-bold text-red-600">{stats.countermeasures_overdue}</p>
                  <p className="text-xs text-gray-500">{t.report.cmOverdue}</p>
                </div>
              </div>
              {overdueDetails.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-red-600 mb-2">{t.report.overdueCms} ({overdueDetails.length})</h4>
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {overdueDetails.map((d, i) => (
                      <div key={i} className="flex items-start gap-3 p-2 rounded border border-red-200 bg-red-50/50 text-sm">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900">{d.risk_title}</div>
                          <div className="text-gray-600">{t.report.cmLabel}: {d.description}</div>
                          <div className="text-gray-500 text-xs">
                            {t.risk.assignee}: {d.assignee_name} · {t.risk.countermeasureDeadline}: {d.deadline ? format(new Date(d.deadline), 'dd.MM.yyyy') : '—'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-500"></span><span>{t.report.expiredDeadline}</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-yellow-500"></span><span>{t.report.expiringWithin3Days}</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-500"></span><span>{t.report.activeGt7Days}</span></div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border">
                    <TableHead className="w-[40px]">
                      <button onClick={toggleSelectAll} className="p-1 hover:bg-pink-100 rounded transition-colors">
                        {items.length > 0 && items.every(it => selectedRisks.has(it.id))
                          ? <CheckSquare className="h-4 w-4 text-pink-600" />
                          : <Square className="h-4 w-4 text-gray-400" />}
                      </button>
                    </TableHead>
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
                      <TableCell colSpan={9} className="text-center py-12 text-gray-500 dark:text-gray-400">
                        {t.report.noRisksFound}
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item: PaginatedReport['items'][0]) => {
                      const hasExpired = item.countermeasures?.some(cm => cm.is_expired) || false;
                      const hasExpiringSoon = item.countermeasures?.some(cm => cm.is_expiring_soon) || false;
                      const rowClass = hasExpired ? 'bg-red-50 dark:bg-red-900/10' : hasExpiringSoon ? 'bg-yellow-50 dark:bg-yellow-900/10' : '';
                      const isExpanded = expandedRows.has(item.id);
                      const isSelected = selectedRisks.has(item.id);

                      return (
                        <Fragment key={item.id}>
                          <TableRow className={cn('hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer', rowClass, isSelected && 'bg-pink-50/50')} onClick={() => toggleRow(item.id)}>
                            <TableCell onClick={(e) => { e.stopPropagation(); }}>
                              <button className="p-1 hover:bg-pink-100 rounded transition-colors" onClick={() => toggleSelect(item.id)}>
                                {isSelected ? <CheckSquare className="h-4 w-4 text-pink-600" /> : <Square className="h-4 w-4 text-gray-400" />}
                              </button>
                            </TableCell>
                            <TableCell>
                              <button className="p-1 hover:bg-pink-100 rounded transition-colors">
                                {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                              </button>
                            </TableCell>
                            <TableCell className="font-medium text-gray-900 dark:text-white max-w-xs truncate" title={item.title}>{item.title}</TableCell>
                            <TableCell><span className="text-sm text-gray-600 dark:text-gray-400 max-w-[150px] truncate block">{item.target_name}</span></TableCell>
                            <TableCell><span className="text-sm text-gray-600 dark:text-gray-400 max-w-[150px] truncate block">{item.owner_name}</span></TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={cn('capitalize', statusColors[item.status as keyof typeof statusColors] || '')}>
                                {item.status === 'IN_PROGRESS' ? t.risk.inProgress : t.risk.completed}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={cn('capitalize', levelColors[item.probability as keyof typeof levelColors] || '')}>{item.probability}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={cn('capitalize', levelColors[item.impact as keyof typeof levelColors] || '')}>{item.impact}</Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedRisk(item.id); }} className="text-pink-600 hover:text-pink-700 hover:bg-pink-50" aria-label={t.risk.editRisk}>
                                <FileText className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`${item.id}-expanded`}>
                              <TableCell colSpan={9} className="bg-pink-50/30 border-t-0">
                                <div className="p-4 space-y-4">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <span className="text-gray-500 font-medium">{t.risk.maxCauseProbability}:</span>
                                      <Badge variant="secondary" className={cn('ml-2 capitalize', levelColors[item.max_cause_probability as keyof typeof levelColors] || '')}>{item.max_cause_probability || 'N/A'}</Badge>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 font-medium">{t.risk.maxConsequenceProbability}:</span>
                                      <Badge variant="secondary" className={cn('ml-2 capitalize', levelColors[item.max_consequence_probability as keyof typeof levelColors] || '')}>{item.max_consequence_probability || 'N/A'}</Badge>
                                    </div>
                                  </div>

                                  {item.countermeasures && item.countermeasures.length > 0 && (
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-900 mb-2">{t.risk.countermeasures}</h4>
                                      <div className="space-y-2">
                                        {item.countermeasures.map((cm) => {
                                          const deadline = cm.deadline ? new Date(cm.deadline) : null;
                                          const isOverdue = cm.status === 'PENDING' && deadline && deadline < new Date();
                                          const isExpiringSoon = deadline && deadline >= new Date() && deadline <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

                                          let badgeColor = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
                                          if (isOverdue) badgeColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
                                          else if (isExpiringSoon) badgeColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';

                                          return (
                                            <div key={cm.id} className="flex items-center gap-3 p-2 bg-white/60 rounded-lg border border-pink-100 min-w-0">
                                              <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{cm.description}</span>
                                              <Badge variant="secondary" className={cn('text-xs', cmStatusColors[cm.status as keyof typeof cmStatusColors] || '')}>{cm.status}</Badge>
                                              <span className="text-xs text-gray-500 shrink-0 whitespace-nowrap">{t.risk.assignee}: {cm.assignee_name}</span>
                                              {deadline && <Badge variant="secondary" className={cn(badgeColor, 'text-xs')}>{format(deadline, 'MMM d, yyyy')}</Badge>}
                                              <Badge variant="outline" className="text-xs capitalize">{cm.target_type === 'CAUSE' ? t.risk.causes : t.risk.consequences}</Badge>
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
                    <TableCell colSpan={9} className="py-4">
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
                            {t.common.pageXofY.replace('{current}', String(page)).replace('{total}', String(totalPages || 1))}
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
    </>
  );
}
