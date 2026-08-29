'use client';

import { Course } from '@/server/admin/courses.server';
import {
  createEnrollment,
  Enrollment,
  EnrollmentsMeta,
  getEnrollments,
} from '@/server/admin/enrollments.server';
import { AdminUser } from '@/server/admin/users.server';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@repo/shadcn/command';
import { Check, ChevronsUpDown } from '@repo/shadcn/lucide';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/shadcn/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/shadcn/select';
import { toast } from '@repo/shadcn/sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/shadcn/table';
import { cn } from '@repo/shadcn/lib/utils';
import { useCallback, useEffect, useState } from 'react';
import {
  EmptyState,
  FilterField,
  SearchInput,
  TablePagination,
  TableSkeletonRows,
  useDebouncedValue,
} from './data-toolbar';

const PAGE_SIZE = 20;

function EntityPicker({
  items,
  value,
  onChange,
  placeholder,
  emptyText,
  searchPlaceholder,
  id,
}: {
  items: { id: string; label: string; hint?: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  emptyText: string;
  searchPlaceholder: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((item) => item.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-11 w-full justify-between font-normal sm:h-9"
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(22rem,90vw)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.hint ?? ''}`}
                  onSelect={() => {
                    onChange(item.id === value ? '' : item.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 size-4',
                      item.id === value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{item.label}</span>
                    {item.hint && (
                      <span className="text-muted-foreground truncate text-xs">
                        {item.hint}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function EnrollmentsClient({
  courses,
  students,
}: {
  courses: Course[];
  students: AdminUser[];
}) {
  const [courseId, setCourseId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [meta, setMeta] = useState<EnrollmentsMeta>({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
  });
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getEnrollments({
      courseId: courseId || undefined,
      status,
      search: debouncedSearch,
      page,
      limit: PAGE_SIZE,
    });
    setEnrollments(result.data);
    setMeta(result.meta);
    setLoading(false);
  }, [courseId, status, debouncedSearch, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [courseId, status, debouncedSearch]);

  const handleEnroll = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!courseId || !studentId) {
      toast.error('Select both a course and a student');
      return;
    }
    setEnrolling(true);
    const result = await createEnrollment(studentId, courseId);
    setEnrolling(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Student enrolled');
    setStudentId('');
    void load();
  };

  const total = meta.total;
  const limit = meta.limit || PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Enrollments</h1>
          <p className="text-muted-foreground text-xs">{total} matching enrollments</p>
        </div>
      </div>

      <Card className="gap-3 py-3">
        <CardHeader className="px-3 sm:px-4">
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-3 sm:flex-row sm:flex-wrap sm:items-end sm:px-4">
          <FilterField label="Course" className="w-full sm:w-64">
            <EntityPicker
              id="enrollment-course-filter"
              items={courses.map((course) => ({
                id: course.id,
                label: course.title,
                hint: `/${course.slug}`,
              }))}
              value={courseId}
              onChange={setCourseId}
              placeholder="All courses"
              searchPlaceholder="Search courses..."
              emptyText="No courses found."
            />
          </FilterField>
          <FilterField label="Status" className="w-full sm:w-40">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-11 w-full sm:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Search" className="w-full sm:max-w-xs">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search student name or email"
              className="sm:max-w-none"
            />
          </FilterField>
        </CardContent>
      </Card>

      <Card className="gap-3 py-3">
        <CardHeader className="px-3 sm:px-4">
          <CardTitle className="text-sm font-medium">Enroll a student</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-4">
          <form
            onSubmit={handleEnroll}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <FilterField label="Student" className="w-full sm:w-72">
              <EntityPicker
                id="enrollment-student"
                items={students.map((student) => ({
                  id: student.id,
                  label: student.full_name ?? student.email,
                  hint: student.email,
                }))}
                value={studentId}
                onChange={setStudentId}
                placeholder="Select student"
                searchPlaceholder="Search students..."
                emptyText="No students found."
              />
            </FilterField>
            <FilterField label="Course" className="w-full sm:w-64">
              <EntityPicker
                items={courses.map((course) => ({
                  id: course.id,
                  label: course.title,
                  hint: `/${course.slug}`,
                }))}
                value={courseId}
                onChange={setCourseId}
                placeholder="Select course"
                searchPlaceholder="Search courses..."
                emptyText="No courses found."
              />
            </FilterField>
            <Button
              type="submit"
              className="h-11 sm:h-9"
              disabled={enrolling || !courseId || !studentId}
            >
              {enrolling ? 'Enrolling...' : 'Enroll Student'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {!loading && enrollments.length === 0 ? (
        <EmptyState
          title="No enrollments found"
          description="Adjust the course, status, or search filters."
        />
      ) : (
        <Card className="gap-0 py-0">
          <div className="w-full overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-2 py-1.5 text-xs uppercase">Student</TableHead>
                  <TableHead className="hidden px-2 py-1.5 text-xs uppercase md:table-cell">
                    Course
                  </TableHead>
                  <TableHead className="hidden px-2 py-1.5 text-xs uppercase sm:table-cell">
                    Enrolled
                  </TableHead>
                  <TableHead className="px-2 py-1.5 text-xs uppercase">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSkeletonRows rows={5} columns={4} />
                ) : (
                  enrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell className="max-w-[220px] py-2">
                        <div className="flex flex-col">
                          <span className="truncate font-medium">
                            {enrollment.profiles?.full_name ??
                              enrollment.profiles?.email ??
                              enrollment.student_id}
                          </span>
                          <span className="text-muted-foreground truncate text-xs">
                            {enrollment.profiles?.email ?? ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden max-w-[220px] py-2 text-xs md:table-cell">
                        <span className="truncate">
                          {enrollment.courses?.title ?? enrollment.course_id}
                        </span>
                      </TableCell>
                      <TableCell className="hidden py-2 text-xs sm:table-cell">
                        {new Date(enrollment.enrolled_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge
                          variant={
                            enrollment.status === 'active' ? 'default' : 'secondary'
                          }
                        >
                          {enrollment.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="px-3 pb-3 sm:px-4">
            <TablePagination
              page={page}
              pageCount={pageCount}
              from={from}
              to={to}
              total={total}
              onPageChange={setPage}
              label="enrollments"
            />
          </div>
        </Card>
      )}
    </div>
  );
}
