'use client';

import { Button } from '@repo/shadcn/button';
import { Input } from '@repo/shadcn/input';
import { Label } from '@repo/shadcn/label';
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Search,
} from '@repo/shadcn/lucide';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@repo/shadcn/pagination';
import { Skeleton } from '@repo/shadcn/skeleton';
import { TableCell, TableHead, TableRow } from '@repo/shadcn/table';
import { cn } from '@repo/shadcn/lib/utils';
import { useEffect, useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export type SortState<TKey extends string> = {
  key: TKey;
  direction: SortDirection;
};

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function toggleSort<TKey extends string>(
  current: SortState<TKey>,
  key: TKey,
): SortState<TKey> {
  if (current.key !== key) return { key, direction: 'asc' };
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
}

export function compareValues(
  left: string | number | null | undefined,
  right: string | number | null | undefined,
): number {
  const leftEmpty = left === null || left === undefined || left === '';
  const rightEmpty = right === null || right === undefined || right === '';
  if (leftEmpty && rightEmpty) return 0;
  if (leftEmpty) return 1;
  if (rightEmpty) return -1;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative w-full sm:max-w-xs', className)}>
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 pl-8 sm:h-9"
      />
    </div>
  );
}

export function SortableHeader<TKey extends string>({
  sortKey,
  sort,
  onSort,
  children,
  className,
}: {
  sortKey: TKey;
  sort: SortState<TKey>;
  onSort: (key: TKey) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const isActive = sort.key === sortKey;
  return (
    <TableHead className={cn('px-2 py-1.5', className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-label={`Sort by ${String(children)}`}
        className="hover:text-foreground text-muted-foreground -mx-1 flex items-center gap-1 rounded px-1 py-1 text-xs font-medium tracking-wide uppercase"
      >
        {children}
        {isActive ? (
          sort.direction === 'asc' ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ChevronsUpDown className="size-3 opacity-50" />
        )}
      </button>
    </TableHead>
  );
}

export function TableSkeletonRows({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={`skeleton-row-${rowIndex}`}>
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <TableCell key={`skeleton-cell-${rowIndex}-${columnIndex}`} className="py-2">
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="text-muted-foreground text-xs">{description}</p>
      )}
    </div>
  );
}

export function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);

  useEffect(() => {
    setPage(1);
  }, [total, pageSize]);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  return {
    page: safePage,
    pageCount,
    total,
    pageItems,
    setPage,
    from: total === 0 ? 0 : (safePage - 1) * pageSize + 1,
    to: Math.min(safePage * pageSize, total),
  };
}

export function TablePagination({
  page,
  pageCount,
  from,
  to,
  total,
  onPageChange,
  label = 'items',
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  const pages = useMemo(() => {
    const windowSize = 5;
    const start = Math.max(1, Math.min(page - 2, pageCount - windowSize + 1));
    const end = Math.min(pageCount, start + windowSize - 1);
    const result: number[] = [];
    for (let index = start; index <= end; index += 1) result.push(index);
    return result;
  }, [page, pageCount]);

  return (
    <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-xs">
        Showing {from}-{to} of {total} {label}
      </p>
      <Pagination className="mx-0 w-auto justify-start sm:justify-end">
        <PaginationContent>
          <PaginationItem>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11 sm:h-8"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Prev
            </Button>
          </PaginationItem>
          {pages.map((pageNumber) => (
            <PaginationItem key={pageNumber}>
              <Button
                type="button"
                variant={pageNumber === page ? 'outline' : 'ghost'}
                size="sm"
                className="h-11 w-11 sm:h-8 sm:w-8"
                onClick={() => onPageChange(pageNumber)}
                aria-current={pageNumber === page ? 'page' : undefined}
              >
                {pageNumber}
              </Button>
            </PaginationItem>
          ))}
          <PaginationItem>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11 sm:h-8"
              disabled={page >= pageCount}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

export function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Label className="text-muted-foreground text-[11px] tracking-wide uppercase">
        {label}
      </Label>
      {children}
    </div>
  );
}
