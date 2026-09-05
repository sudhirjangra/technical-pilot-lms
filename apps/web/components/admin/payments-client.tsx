'use client';

import { Payment } from '@/server/admin/payments.types';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import { Input } from '@repo/shadcn/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/shadcn/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/shadcn/table';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  IndianRupee,
  RotateCcw,
  SlidersHorizontal,
  X,
  XCircle,
} from '@repo/shadcn/lucide';
import { cn } from '@repo/shadcn/lib/utils';
import { toast } from '@repo/shadcn/sonner';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  compareValues,
  EmptyState,
  FilterField,
  SearchInput,
  SortableHeader,
  SortState,
  TablePagination,
  toggleSort,
  useDebouncedValue,
  usePagination,
} from './data-toolbar';
import { PaymentDetailDialog, getStatusBadge } from './payment-detail-dialog';
import { PaymentsAnalytics } from './payments-analytics';

type PaymentSortKey = 'student' | 'course' | 'amount' | 'status' | 'created_at';

const PAGE_SIZE = 15;

export function PaymentsClient({ payments }: { payments: Payment[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sort, setSort] = useState<SortState<PaymentSortKey>>({
    key: 'created_at',
    direction: 'desc',
  });

  // Dialog state
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Derive unique courses from payment records
  const courses = useMemo(() => {
    const courseMap = new Map<string, string>();
    for (const p of payments) {
      if (p.course_id && p.courses?.title) {
        courseMap.set(p.course_id, p.courses.title);
      }
    }
    return Array.from(courseMap.entries()).map(([id, title]) => ({ id, title }));
  }, [payments]);

  // Compute status counts for quick-filter tabs
  const statusCounts = useMemo(() => {
    const counts = {
      all: payments.length,
      completed: 0,
      pending: 0,
      failed: 0,
      refunded: 0,
    };
    for (const p of payments) {
      if (p.status in counts) {
        counts[p.status as keyof typeof counts]++;
      }
    }
    return counts;
  }, [payments]);

  // Filter & sort payments
  const filtered = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    const fromTime = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const toTime = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;

    const result = payments.filter((payment) => {
      const studentName = payment.profiles?.full_name ?? payment.profiles?.email ?? '';
      const matchesQuery =
        !query ||
        studentName.toLowerCase().includes(query) ||
        (payment.profiles?.email ?? '').toLowerCase().includes(query) ||
        (payment.courses?.title ?? '').toLowerCase().includes(query) ||
        (payment.razorpay_payment_id ?? '').toLowerCase().includes(query) ||
        (payment.razorpay_order_id ?? '').toLowerCase().includes(query) ||
        (payment.invoice_number ?? '').toLowerCase().includes(query);

      const matchesStatus = status === 'all' || payment.status === status;
      const matchesCourse = courseFilter === 'all' || payment.course_id === courseFilter;
      const createdTime = new Date(payment.created_at).getTime();
      const matchesFrom = fromTime === null || createdTime >= fromTime;
      const matchesTo = toTime === null || createdTime <= toTime;

      return matchesQuery && matchesStatus && matchesCourse && matchesFrom && matchesTo;
    });

    return result.sort((left, right) => {
      const factor = sort.direction === 'asc' ? 1 : -1;
      if (sort.key === 'student') {
        return (
          compareValues(
            left.profiles?.full_name ?? left.profiles?.email ?? '',
            right.profiles?.full_name ?? right.profiles?.email ?? '',
          ) * factor
        );
      }
      if (sort.key === 'course') {
        return (
          compareValues(left.courses?.title ?? '', right.courses?.title ?? '') * factor
        );
      }
      if (sort.key === 'amount') {
        return compareValues(left.amount ?? 0, right.amount ?? 0) * factor;
      }
      return compareValues(left[sort.key], right[sort.key]) * factor;
    });
  }, [payments, debouncedSearch, status, courseFilter, fromDate, toDate, sort]);

  const pagination = usePagination(filtered, PAGE_SIZE);

  const totalCollectedInView = useMemo(
    () =>
      filtered
        .filter((payment) => payment.status === 'completed')
        .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0),
    [filtered],
  );

  const handleSort = (key: PaymentSortKey) =>
    setSort((current) => toggleSort(current, key));

  const hasActiveFilters =
    search.trim() !== '' ||
    status !== 'all' ||
    courseFilter !== 'all' ||
    fromDate !== '' ||
    toDate !== '';

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setCourseFilter('all');
    setFromDate('');
    setToDate('');
  };

  const handleExportCsv = () => {
    if (filtered.length === 0) {
      toast.error('No payments to export in current view');
      return;
    }

    const headers = [
      'Invoice Number',
      'Date & Time',
      'Student Name',
      'Student Email',
      'Student Phone',
      'Course Title',
      'Amount (INR)',
      'Discount (INR)',
      'Status',
      'Razorpay Payment ID',
      'Razorpay Order ID',
      'Refund Reason',
    ];

    const rows = filtered.map((p) => [
      `"${p.invoice_number || p.id}"`,
      `"${new Date(p.created_at).toISOString()}"`,
      `"${p.profiles?.full_name || ''}"`,
      `"${p.profiles?.email || ''}"`,
      `"${p.profiles?.phone || ''}"`,
      `"${p.courses?.title || ''}"`,
      p.amount,
      p.discount_amount || 0,
      `"${p.status}"`,
      `"${p.razorpay_payment_id || ''}"`,
      `"${p.razorpay_order_id || ''}"`,
      `"${p.refund_reason || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `payments_export_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filtered.length} payments to CSV`);
  };

  const openPaymentDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Payments & Revenue
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            Monitor transactions, analyze collections, manage refunds, and audit payment lifecycles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-9 gap-1.5 text-xs font-medium"
          >
            <Download className="size-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Analytics & Charts Section */}
      <PaymentsAnalytics payments={payments} filteredPayments={filtered} />

      {/* Quick Status Pill Filters */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <button
          type="button"
          onClick={() => setStatus('all')}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
            status === 'all'
              ? 'bg-foreground text-background shadow-xs'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <span>All Statuses</span>
          <span
            className={cn(
              'rounded-full px-1.5 py-0.2 text-[10px] font-semibold',
              status === 'all' ? 'bg-background/20 text-background' : 'bg-background text-foreground',
            )}
          >
            {statusCounts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatus('completed')}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
            status === 'completed'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20',
          )}
        >
          <CheckCircle2 className="size-3" />
          <span>Completed</span>
          <span
            className={cn(
              'rounded-full px-1.5 py-0.2 text-[10px] font-semibold',
              status === 'completed' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
            )}
          >
            {statusCounts.completed}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatus('pending')}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
            status === 'pending'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20',
          )}
        >
          <Clock className="size-3" />
          <span>Pending</span>
          <span
            className={cn(
              'rounded-full px-1.5 py-0.2 text-[10px] font-semibold',
              status === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
            )}
          >
            {statusCounts.pending}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatus('failed')}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
            status === 'failed'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20',
          )}
        >
          <XCircle className="size-3" />
          <span>Failed</span>
          <span
            className={cn(
              'rounded-full px-1.5 py-0.2 text-[10px] font-semibold',
              status === 'failed' ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-700 dark:text-rose-300',
            )}
          >
            {statusCounts.failed}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatus('refunded')}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
            status === 'refunded'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20',
          )}
        >
          <RotateCcw className="size-3" />
          <span>Refunded</span>
          <span
            className={cn(
              'rounded-full px-1.5 py-0.2 text-[10px] font-semibold',
              status === 'refunded' ? 'bg-white/20 text-white' : 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
            )}
          >
            {statusCounts.refunded}
          </span>
        </button>
      </div>

      {/* Advanced Filter Toolbar */}
      <Card className="border-border/60 bg-card/60 gap-3 py-3 backdrop-blur-sm">
        <CardHeader className="px-3 pb-1 sm:px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <SlidersHorizontal className="size-3.5" />
            Filter Transactions
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
            >
              <X className="size-3" />
              <span>Reset Filters</span>
            </Button>
          )}
        </CardHeader>

        <CardContent className="flex flex-col gap-3 px-3 sm:flex-row sm:flex-wrap sm:items-end sm:px-4">
          <FilterField label="Search Query" className="w-full sm:max-w-xs">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Student, email, course, payment id, invoice"
              className="sm:max-w-none"
            />
          </FilterField>

          {courses.length > 0 && (
            <FilterField label="Course" className="w-full sm:w-48">
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="h-9 w-full text-xs">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          )}

          <FilterField label="Status" className="w-full sm:w-36">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="From Date" className="w-full sm:w-36">
            <Input
              type="date"
              value={fromDate}
              className="h-9 text-xs"
              onChange={(event) => setFromDate(event.target.value)}
            />
          </FilterField>

          <FilterField label="To Date" className="w-full sm:w-36">
            <Input
              type="date"
              value={toDate}
              className="h-9 text-xs"
              onChange={(event) => setToDate(event.target.value)}
            />
          </FilterField>
        </CardContent>
      </Card>

      {/* Main Payments Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No payments found"
          description={
            payments.length === 0
              ? 'Payments will appear here once students purchase courses.'
              : 'Try clearing or changing your filters to see more results.'
          }
        />
      ) : (
        <Card className="gap-0 py-0 border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
          <div className="w-full overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="w-[140px] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Invoice
                  </TableHead>
                  <SortableHeader sortKey="student" sort={sort} onSort={handleSort} className="px-3">
                    Student
                  </SortableHeader>
                  <SortableHeader
                    sortKey="course"
                    sort={sort}
                    onSort={handleSort}
                    className="hidden md:table-cell px-3"
                  >
                    Course
                  </SortableHeader>
                  <SortableHeader sortKey="amount" sort={sort} onSort={handleSort} className="px-3">
                    Amount
                  </SortableHeader>
                  <SortableHeader sortKey="status" sort={sort} onSort={handleSort} className="px-3">
                    Status
                  </SortableHeader>
                  <SortableHeader
                    sortKey="created_at"
                    sort={sort}
                    onSort={handleSort}
                    className="hidden sm:table-cell px-3"
                  >
                    Date
                  </SortableHeader>
                  <TableHead className="w-[80px] px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {pagination.pageItems.map((payment) => {
                  const studentName =
                    payment.profiles?.full_name ||
                    payment.profiles?.email?.split('@')[0] ||
                    'Student';
                  const studentEmail = payment.profiles?.email;

                  return (
                    <TableRow
                      key={payment.id}
                      onClick={() => openPaymentDetails(payment)}
                      className="cursor-pointer border-border/40 hover:bg-muted/50 transition-colors"
                    >
                      {/* Invoice */}
                      <TableCell className="px-3 py-3">
                        <div className="font-mono text-xs font-medium text-foreground truncate max-w-[130px]">
                          {payment.invoice_number || payment.id.slice(0, 8)}
                        </div>
                        {payment.razorpay_payment_id && (
                          <span className="text-[10px] text-muted-foreground block truncate max-w-[130px] font-mono">
                            {payment.razorpay_payment_id}
                          </span>
                        )}
                      </TableCell>

                      {/* Student */}
                      <TableCell className="px-3 py-3 max-w-[200px]">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                            {studentName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="truncate font-medium text-xs text-foreground">
                              {studentName}
                            </span>
                            <span className="text-muted-foreground truncate text-[11px]">
                              {studentEmail}
                            </span>
                            <span className="text-muted-foreground truncate text-[11px] md:hidden mt-0.5">
                              {payment.courses?.title || 'Unknown course'}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Course */}
                      <TableCell className="hidden max-w-[220px] px-3 py-3 text-xs md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate font-medium">
                            {payment.courses?.title || 'Unknown course'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Amount */}
                      <TableCell className="px-3 py-3 text-xs">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">
                            ₹{Number(payment.amount).toLocaleString('en-IN')}
                          </span>
                          {payment.discount_amount && payment.discount_amount > 0 ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              Saved ₹{payment.discount_amount}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="px-3 py-3">
                        {getStatusBadge(payment.status)}
                      </TableCell>

                      {/* Date */}
                      <TableCell className="text-muted-foreground hidden px-3 py-3 text-xs sm:table-cell whitespace-nowrap">
                        <div>
                          <span>{new Date(payment.created_at).toLocaleDateString('en-IN')}</span>
                          <span className="text-[10px] block opacity-70">
                            {new Date(payment.created_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPaymentDetails(payment)}
                          className="h-7 gap-1 px-2 text-xs font-medium hover:bg-muted"
                        >
                          <Eye className="size-3.5 text-muted-foreground" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="border-t border-border/50 px-3 py-3 sm:px-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              Showing {pagination.from}–{pagination.to} of {pagination.total} payments (
              ₹{totalCollectedInView.toLocaleString('en-IN')} collected)
            </div>
            <TablePagination
              page={pagination.page}
              pageCount={pagination.pageCount}
              from={pagination.from}
              to={pagination.to}
              total={pagination.total}
              onPageChange={pagination.setPage}
              label="payments"
            />
          </div>
        </Card>
      )}

      {/* Payment Details Modal */}
      <PaymentDetailDialog
        payment={selectedPayment}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onPaymentUpdated={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
