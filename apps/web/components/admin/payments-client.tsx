'use client';

import { Payment } from '@/server/admin/payments.server';
import { Badge } from '@repo/shadcn/badge';
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

type PaymentSortKey = 'student' | 'course' | 'amount' | 'status' | 'created_at';

const PAGE_SIZE = 15;

const statusVariant = (status: string) => {
  if (status === 'completed') return 'default' as const;
  if (status === 'failed') return 'destructive' as const;
  return 'secondary' as const;
};

export function PaymentsClient({ payments }: { payments: Payment[] }) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sort, setSort] = useState<SortState<PaymentSortKey>>({
    key: 'created_at',
    direction: 'desc',
  });

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
        (payment.razorpay_order_id ?? '').toLowerCase().includes(query);
      const matchesStatus = status === 'all' || payment.status === status;
      const createdTime = new Date(payment.created_at).getTime();
      const matchesFrom = fromTime === null || createdTime >= fromTime;
      const matchesTo = toTime === null || createdTime <= toTime;
      return matchesQuery && matchesStatus && matchesFrom && matchesTo;
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
  }, [payments, debouncedSearch, status, fromDate, toDate, sort]);

  const pagination = usePagination(filtered, PAGE_SIZE);

  const totalAmount = useMemo(
    () =>
      filtered
        .filter((payment) => payment.status === 'completed')
        .reduce((sum, payment) => sum + (payment.amount ?? 0), 0),
    [filtered],
  );

  const handleSort = (key: PaymentSortKey) =>
    setSort((current) => toggleSort(current, key));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Payments</h1>
          <p className="text-muted-foreground text-xs">
            {payments.length} total • ₹{totalAmount} collected in current view
          </p>
        </div>
      </div>

      <Card className="gap-3 py-3">
        <CardHeader className="px-3 sm:px-4">
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-3 sm:flex-row sm:flex-wrap sm:items-end sm:px-4">
          <FilterField label="Search" className="w-full sm:max-w-xs">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search student, course, payment id"
              className="sm:max-w-none"
            />
          </FilterField>
          <FilterField label="Status" className="w-full sm:w-40">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-11 w-full sm:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="From" className="w-full sm:w-40">
            <Input
              type="date"
              value={fromDate}
              className="h-11 sm:h-9"
              onChange={(event) => setFromDate(event.target.value)}
            />
          </FilterField>
          <FilterField label="To" className="w-full sm:w-40">
            <Input
              type="date"
              value={toDate}
              className="h-11 sm:h-9"
              onChange={(event) => setToDate(event.target.value)}
            />
          </FilterField>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="No payments found"
          description={
            payments.length === 0
              ? 'Payments will appear here once students purchase courses.'
              : 'Try a different search, status, or date range.'
          }
        />
      ) : (
        <Card className="gap-0 py-0">
          <div className="w-full overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <SortableHeader sortKey="student" sort={sort} onSort={handleSort}>
                    Student
                  </SortableHeader>
                  <SortableHeader
                    sortKey="course"
                    sort={sort}
                    onSort={handleSort}
                    className="hidden md:table-cell"
                  >
                    Course
                  </SortableHeader>
                  <SortableHeader sortKey="amount" sort={sort} onSort={handleSort}>
                    Amount
                  </SortableHeader>
                  <SortableHeader sortKey="status" sort={sort} onSort={handleSort}>
                    Status
                  </SortableHeader>
                  <SortableHeader
                    sortKey="created_at"
                    sort={sort}
                    onSort={handleSort}
                    className="hidden sm:table-cell"
                  >
                    Date
                  </SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.pageItems.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="max-w-[200px] py-2">
                      <div className="flex flex-col">
                        <span className="truncate font-medium">
                          {payment.profiles?.full_name ??
                            payment.profiles?.email ??
                            'Unknown'}
                        </span>
                        <span className="text-muted-foreground truncate text-xs md:hidden">
                          {payment.courses?.title ?? 'Unknown course'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden max-w-[220px] py-2 text-xs md:table-cell">
                      <span className="truncate">
                        {payment.courses?.title ?? 'Unknown course'}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-xs">₹{payment.amount}</TableCell>
                    <TableCell className="py-2">
                      <Badge variant={statusVariant(payment.status)}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden py-2 text-xs sm:table-cell">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="px-3 pb-3 sm:px-4">
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
    </div>
  );
}
