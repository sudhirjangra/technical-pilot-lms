'use client';

import { AdminUser } from '@/server/admin/users.server';
import { Badge } from '@repo/shadcn/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
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

type UserSortKey = 'full_name' | 'email' | 'role' | 'created_at';

const PAGE_SIZE = 15;

export function StudentsClient({ users }: { users: AdminUser[] }) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [role, setRole] = useState('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sort, setSort] = useState<SortState<UserSortKey>>({
    key: 'created_at',
    direction: 'desc',
  });

  const roles = useMemo(
    () => Array.from(new Set(users.map((user) => user.role))).sort(),
    [users],
  );

  const filtered = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    const result = users.filter((user) => {
      const matchesQuery =
        !query ||
        user.email.toLowerCase().includes(query) ||
        (user.full_name ?? '').toLowerCase().includes(query) ||
        (user.phone ?? '').toLowerCase().includes(query);
      const matchesRole = role === 'all' || user.role === role;
      const isActive = user.is_active !== false;
      const matchesActive =
        activeFilter === 'all' ||
        (activeFilter === 'active' && isActive) ||
        (activeFilter === 'inactive' && !isActive);
      return matchesQuery && matchesRole && matchesActive;
    });

    return result.sort((left, right) => {
      const factor = sort.direction === 'asc' ? 1 : -1;
      if (sort.key === 'full_name') {
        return (
          compareValues(left.full_name ?? left.email, right.full_name ?? right.email) *
          factor
        );
      }
      return compareValues(left[sort.key], right[sort.key]) * factor;
    });
  }, [users, debouncedSearch, role, activeFilter, sort]);

  const pagination = usePagination(filtered, PAGE_SIZE);

  const handleSort = (key: UserSortKey) =>
    setSort((current) => toggleSort(current, key));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Students &amp; Users</h1>
          <p className="text-muted-foreground text-xs">{users.length} total</p>
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
              placeholder="Search name, email, phone"
              className="sm:max-w-none"
            />
          </FilterField>
          <FilterField label="Role" className="w-full sm:w-40">
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-11 w-full sm:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {roles.map((roleName) => (
                  <SelectItem key={roleName} value={roleName}>
                    {roleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Account" className="w-full sm:w-40">
            <Select
              value={activeFilter}
              onValueChange={(value) =>
                setActiveFilter(value as 'all' | 'active' | 'inactive')
              }
            >
              <SelectTrigger className="h-11 w-full sm:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="No users found"
          description="Try a different search or filter."
        />
      ) : (
        <Card className="gap-0 py-0">
          <div className="w-full overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <SortableHeader sortKey="full_name" sort={sort} onSort={handleSort}>
                    Name
                  </SortableHeader>
                  <SortableHeader
                    sortKey="email"
                    sort={sort}
                    onSort={handleSort}
                    className="hidden md:table-cell"
                  >
                    Email
                  </SortableHeader>
                  <SortableHeader sortKey="role" sort={sort} onSort={handleSort}>
                    Role
                  </SortableHeader>
                  <TableHead className="px-2 py-1.5 text-xs uppercase">Status</TableHead>
                  <SortableHeader
                    sortKey="created_at"
                    sort={sort}
                    onSort={handleSort}
                    className="hidden sm:table-cell"
                  >
                    Joined
                  </SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.pageItems.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="max-w-[200px] py-2">
                      <div className="flex flex-col">
                        <span className="truncate font-medium">
                          {user.full_name ?? user.email}
                        </span>
                        <span className="text-muted-foreground truncate text-xs md:hidden">
                          {user.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden max-w-[240px] py-2 text-xs md:table-cell">
                      <span className="truncate">{user.email}</span>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge
                        variant={user.is_active !== false ? 'default' : 'destructive'}
                      >
                        {user.is_active !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden py-2 text-xs sm:table-cell">
                      {new Date(user.created_at).toLocaleDateString()}
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
              label="users"
            />
          </div>
        </Card>
      )}
    </div>
  );
}
