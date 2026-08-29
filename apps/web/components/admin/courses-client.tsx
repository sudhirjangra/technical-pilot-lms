'use client';

import { Category } from '@/server/admin/categories.server';
import {
  Course,
  createCourse,
  deleteCourse,
  updateAdminCourse,
} from '@/server/admin/courses.server';
import { Badge } from '@repo/shadcn/badge';
import { Button } from '@repo/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/shadcn/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/shadcn/dialog';
import { Input } from '@repo/shadcn/input';
import { Label } from '@repo/shadcn/label';
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
import { Textarea } from '@repo/shadcn/textarea';
import { slugify } from '@repo/utils';
import Link from 'next/link';
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

type CourseStatus = 'draft' | 'published' | 'archived';
type CourseSortKey = 'title' | 'price' | 'status' | 'category' | 'created_at';

const NO_CATEGORY = '__none__';
const PAGE_SIZE = 10;

type CourseDraft = {
  title: string;
  slug: string;
  description: string;
  category_id: string;
  price: string;
  discount_price: string;
  thumbnail_url: string;
  status: CourseStatus;
};

const emptyDraft = (): CourseDraft => ({
  title: '',
  slug: '',
  description: '',
  category_id: NO_CATEGORY,
  price: '0',
  discount_price: '',
  thumbnail_url: '',
  status: 'draft',
});

const isCourseStatus = (value: string): value is CourseStatus =>
  value === 'draft' || value === 'published' || value === 'archived';

const draftFromCourse = (course: Course): CourseDraft => ({
  title: course.title,
  slug: course.slug,
  description: course.description ?? '',
  category_id: course.category_id ?? NO_CATEGORY,
  price: String(course.price ?? 0),
  discount_price:
    course.discount_price === null || course.discount_price === undefined
      ? ''
      : String(course.discount_price),
  thumbnail_url: course.thumbnail_url ?? '',
  status: isCourseStatus(course.status) ? course.status : 'draft',
});

export function CoursesClient({
  courses,
  categories,
}: {
  courses: Course[];
  categories: Category[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [statusFilter, setStatusFilter] = useState<'all' | CourseStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sort, setSort] = useState<SortState<CourseSortKey>>({
    key: 'created_at',
    direction: 'desc',
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CourseDraft>(emptyDraft());
  const [slugTouched, setSlugTouched] = useState(false);
  const [statusPendingId, setStatusPendingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    const result = courses.filter((course) => {
      const matchesQuery =
        !query ||
        course.title.toLowerCase().includes(query) ||
        course.slug.toLowerCase().includes(query) ||
        (course.description ?? '').toLowerCase().includes(query) ||
        (course.categories?.name ?? '').toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
      const matchesCategory =
        categoryFilter === 'all' ||
        (categoryFilter === NO_CATEGORY
          ? !course.category_id
          : course.category_id === categoryFilter);
      return matchesQuery && matchesStatus && matchesCategory;
    });

    return result.sort((left, right) => {
      const factor = sort.direction === 'asc' ? 1 : -1;
      if (sort.key === 'category') {
        return (
          compareValues(left.categories?.name ?? '', right.categories?.name ?? '') * factor
        );
      }
      if (sort.key === 'price') {
        return compareValues(left.price ?? 0, right.price ?? 0) * factor;
      }
      return compareValues(left[sort.key], right[sort.key]) * factor;
    });
  }, [courses, debouncedSearch, statusFilter, categoryFilter, sort]);

  const pagination = usePagination(filtered, PAGE_SIZE);

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setSlugTouched(false);
    setDialogOpen(true);
  };

  const openEdit = (course: Course) => {
    setEditingId(course.id);
    setDraft(draftFromCourse(course));
    setSlugTouched(true);
    setDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = draft.title.trim();
    const slug = slugify(draft.slug.trim() || title);
    const price = Number(draft.price);
    if (!title || !slug) {
      toast.error('Title and slug are required');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Price must be a valid number');
      return;
    }
    const discountPrice = draft.discount_price.trim()
      ? Number(draft.discount_price)
      : null;
    if (discountPrice !== null && (!Number.isFinite(discountPrice) || discountPrice < 0)) {
      toast.error('Discount price must be a valid number');
      return;
    }

    setLoading(true);
    const categoryId =
      draft.category_id === NO_CATEGORY ? null : draft.category_id;

    const result = editingId
      ? await updateAdminCourse(editingId, {
        title,
        slug,
        description: draft.description.trim() || null,
        thumbnail_url: draft.thumbnail_url.trim() || null,
        category_id: categoryId,
        price,
        discount_price: discountPrice,
        status: draft.status,
      })
      : await createCourse({
        title,
        slug,
        description: draft.description.trim() || undefined,
        category_id: categoryId ?? undefined,
        price,
        discount_price: discountPrice ?? undefined,
        status: draft.status,
      });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(editingId ? 'Course updated' : 'Course created');
    setDialogOpen(false);
    router.refresh();
  };

  const handleStatusChange = async (course: Course, status: CourseStatus) => {
    if (status === course.status) return;
    setStatusPendingId(course.id);
    const result = await updateAdminCourse(course.id, { status });
    setStatusPendingId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Status changed to ${status}`);
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this course?')) return;
    setLoading(true);
    const result = await deleteCourse(id);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Course deleted');
    router.refresh();
  };

  const handleSort = (key: CourseSortKey) =>
    setSort((current) => toggleSort(current, key));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Courses</h1>
          <p className="text-muted-foreground text-xs">{courses.length} total</p>
        </div>
        <Button size="sm" className="h-11 sm:h-9" onClick={openCreate}>
          + New Course
        </Button>
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
              placeholder="Search title, slug, category"
              className="sm:max-w-none"
            />
          </FilterField>
          <FilterField label="Status" className="w-full sm:w-40">
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value === 'all' || isCourseStatus(value) ? value : 'all')
              }
            >
              <SelectTrigger className="h-11 w-full sm:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Category" className="w-full sm:w-52">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-11 w-full sm:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value={NO_CATEGORY}>Uncategorised</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="No courses found"
          description={
            courses.length === 0
              ? 'Create your first course to get started.'
              : 'Try a different search or filter.'
          }
        />
      ) : (
        <Card className="gap-0 py-0">
          <div className="w-full overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <SortableHeader sortKey="title" sort={sort} onSort={handleSort}>
                    Title
                  </SortableHeader>
                  <SortableHeader
                    sortKey="category"
                    sort={sort}
                    onSort={handleSort}
                    className="hidden md:table-cell"
                  >
                    Category
                  </SortableHeader>
                  <SortableHeader
                    sortKey="price"
                    sort={sort}
                    onSort={handleSort}
                    className="hidden sm:table-cell"
                  >
                    Price
                  </SortableHeader>
                  <SortableHeader sortKey="status" sort={sort} onSort={handleSort}>
                    Status
                  </SortableHeader>
                  <TableHead className="px-2 py-1.5 text-right text-xs uppercase">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.pageItems.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="max-w-[240px] py-2">
                      <Link
                        href={`/admin/courses/${course.id}`}
                        className="flex flex-col hover:underline"
                      >
                        <span className="truncate font-medium">{course.title}</span>
                        <span className="text-muted-foreground truncate text-xs">
                          /{course.slug}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden py-2 text-xs md:table-cell">
                      {course.categories?.name ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden py-2 text-xs sm:table-cell">
                      ₹{course.price}
                      {course.discount_price ? ` → ₹${course.discount_price}` : ''}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <Select
                          value={isCourseStatus(course.status) ? course.status : 'draft'}
                          disabled={statusPendingId === course.id}
                          onValueChange={(value) => {
                            if (isCourseStatus(value)) handleStatusChange(course, value);
                          }}
                        >
                          <SelectTrigger
                            size="sm"
                            className="h-11 w-[7.5rem] sm:h-8"
                            aria-label={`Status for ${course.title}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                        <Badge
                          variant={course.status === 'published' ? 'default' : 'secondary'}
                          className="hidden lg:inline-flex"
                        >
                          {course.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-11 sm:h-8"
                          onClick={() => openEdit(course)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-11 sm:h-8"
                          disabled={loading}
                          onClick={() => handleDelete(course.id)}
                        >
                          Delete
                        </Button>
                      </div>
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
              label="courses"
            />
          </div>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Course' : 'New Course'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update the course details and save your changes.'
                : 'Create a new course.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="course-title" isRequired>
                Title
              </Label>
              <Input
                id="course-title"
                value={draft.title}
                required
                onChange={(event) => {
                  const title = event.target.value;
                  setDraft((current) => ({
                    ...current,
                    title,
                    slug: slugTouched ? current.slug : slugify(title),
                  }));
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="course-slug" isRequired>
                Slug
              </Label>
              <Input
                id="course-slug"
                value={draft.slug}
                required
                placeholder="slug-like-this"
                onChange={(event) => {
                  setSlugTouched(true);
                  setDraft((current) => ({
                    ...current,
                    slug: slugify(event.target.value),
                  }));
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="course-category">Category</Label>
              <Select
                value={draft.category_id}
                onValueChange={(value) =>
                  setDraft((current) => ({ ...current, category_id: value }))
                }
              >
                <SelectTrigger id="course-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>No category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="course-price" isRequired>
                Price (₹)
              </Label>
              <Input
                id="course-price"
                inputMode="decimal"
                required
                value={draft.price}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, price: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="course-discount">Discount price (₹)</Label>
              <Input
                id="course-discount"
                inputMode="decimal"
                value={draft.discount_price}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    discount_price: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="course-thumbnail">Thumbnail URL</Label>
              <Input
                id="course-thumbnail"
                value={draft.thumbnail_url}
                placeholder="https://..."
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    thumbnail_url: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="course-status">Status</Label>
              <Select
                value={draft.status}
                onValueChange={(value) => {
                  if (isCourseStatus(value)) {
                    setDraft((current) => ({ ...current, status: value }));
                  }
                }}
              >
                <SelectTrigger id="course-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="course-description">Description</Label>
              <Textarea
                id="course-description"
                rows={4}
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
