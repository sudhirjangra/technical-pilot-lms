'use client';

import {
  Category,
  createCategory,
  deleteCategory,
  updateCategory,
} from '@/server/admin/categories.server';
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
import { Switch } from '@repo/shadcn/switch';
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
  usePagination,
  useDebouncedValue,
} from './data-toolbar';

type CategorySortKey = 'name' | 'slug' | 'sort_order' | 'is_active';

type CategoryDraft = {
  name: string;
  slug: string;
  description: string;
  sort_order: string;
  is_active: boolean;
};

const emptyDraft = (): CategoryDraft => ({
  name: '',
  slug: '',
  description: '',
  sort_order: '0',
  is_active: true,
});

const draftFromCategory = (category: Category): CategoryDraft => ({
  name: category.name,
  slug: category.slug,
  description: category.description ?? '',
  sort_order: String(category.sort_order ?? 0),
  is_active: category.is_active !== false,
});

const PAGE_SIZE = 10;

export function CategoriesClient({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sort, setSort] = useState<SortState<CategorySortKey>>({
    key: 'sort_order',
    direction: 'asc',
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CategoryDraft>(emptyDraft());
  const [slugTouched, setSlugTouched] = useState(false);
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);
  const [optimisticActive, setOptimisticActive] = useState<Record<string, boolean>>({});

  const isActiveOf = (category: Category) =>
    optimisticActive[category.id] ?? category.is_active !== false;

  const filtered = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    const result = categories.filter((category) => {
      const matchesQuery =
        !query ||
        category.name.toLowerCase().includes(query) ||
        category.slug.toLowerCase().includes(query) ||
        (category.description ?? '').toLowerCase().includes(query);
      const active = isActiveOf(category);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && active) ||
        (statusFilter === 'inactive' && !active);
      return matchesQuery && matchesStatus;
    });

    return result.sort((left, right) => {
      const factor = sort.direction === 'asc' ? 1 : -1;
      if (sort.key === 'is_active') {
        return (Number(isActiveOf(right)) - Number(isActiveOf(left))) * factor;
      }
      if (sort.key === 'sort_order') {
        return compareValues(left.sort_order ?? 0, right.sort_order ?? 0) * factor;
      }
      return compareValues(left[sort.key], right[sort.key]) * factor;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, debouncedSearch, statusFilter, sort, optimisticActive]);

  const pagination = usePagination(filtered, PAGE_SIZE);

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setSlugTouched(false);
    setDialogOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditingId(category.id);
    setDraft(draftFromCategory(category));
    setSlugTouched(true);
    setDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = draft.name.trim();
    const slug = slugify(draft.slug.trim() || name);
    if (!name || !slug) {
      toast.error('Name and slug are required');
      return;
    }

    setLoading(true);
    const payload = {
      name,
      slug,
      description: draft.description.trim() || undefined,
      sort_order: Number(draft.sort_order) || 0,
      is_active: draft.is_active,
    };
    const result = editingId
      ? await updateCategory(editingId, payload)
      : await createCategory(payload);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(editingId ? 'Category updated' : 'Category created');
    setDialogOpen(false);
    router.refresh();
  };

  const handleToggleActive = async (category: Category, nextActive: boolean) => {
    setOptimisticActive((current) => ({ ...current, [category.id]: nextActive }));
    setPendingToggleId(category.id);
    const result = await updateCategory(category.id, { is_active: nextActive });
    setPendingToggleId(null);
    if (result.error) {
      setOptimisticActive((current) => ({
        ...current,
        [category.id]: category.is_active !== false,
      }));
      toast.error(result.error);
      return;
    }
    toast.success(nextActive ? 'Category activated' : 'Category deactivated');
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    setLoading(true);
    const result = await deleteCategory(id);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Category deleted');
    router.refresh();
  };

  const handleSort = (key: CategorySortKey) =>
    setSort((current) => toggleSort(current, key));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Categories</h1>
          <p className="text-muted-foreground text-xs">
            {categories.length} total
          </p>
        </div>
        <Button size="sm" className="h-11 sm:h-9" onClick={openCreate}>
          + New Category
        </Button>
      </div>

      <Card className="gap-3 py-3">
        <CardHeader className="px-3 sm:px-4">
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-3 sm:flex-row sm:items-end sm:px-4">
          <FilterField label="Search" className="w-full sm:max-w-xs">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search name, slug, description"
              className="sm:max-w-none"
            />
          </FilterField>
          <FilterField label="Status" className="w-full sm:w-44">
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as 'all' | 'active' | 'inactive')
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
          title="No categories found"
          description={
            categories.length === 0
              ? 'Create your first category to get started.'
              : 'Try a different search or filter.'
          }
        />
      ) : (
        <Card className="gap-0 py-0">
          <div className="w-full overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <SortableHeader sortKey="name" sort={sort} onSort={handleSort}>
                    Name
                  </SortableHeader>
                  <SortableHeader
                    sortKey="slug"
                    sort={sort}
                    onSort={handleSort}
                    className="hidden md:table-cell"
                  >
                    Slug
                  </SortableHeader>
                  <SortableHeader
                    sortKey="sort_order"
                    sort={sort}
                    onSort={handleSort}
                    className="hidden sm:table-cell"
                  >
                    Order
                  </SortableHeader>
                  <SortableHeader sortKey="is_active" sort={sort} onSort={handleSort}>
                    Active
                  </SortableHeader>
                  <TableHead className="px-2 py-1.5 text-right text-xs uppercase">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.pageItems.map((category) => {
                  const active = isActiveOf(category);
                  return (
                    <TableRow key={category.id}>
                      <TableCell className="max-w-[220px] py-2">
                        <div className="flex flex-col">
                          <span className="truncate font-medium">{category.name}</span>
                          <span className="text-muted-foreground truncate text-xs md:hidden">
                            /{category.slug}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden py-2 text-xs md:table-cell">
                        /{category.slug}
                      </TableCell>
                      <TableCell className="hidden py-2 text-xs sm:table-cell">
                        {category.sort_order ?? 0}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`category-active-${category.id}`}
                            checked={active}
                            disabled={pendingToggleId === category.id}
                            onCheckedChange={(checked) =>
                              handleToggleActive(category, checked)
                            }
                          />
                          <Label
                            htmlFor={`category-active-${category.id}`}
                            className="text-xs"
                          >
                            <Badge variant={active ? 'default' : 'secondary'}>
                              {active ? 'Active' : 'Inactive'}
                            </Badge>
                          </Label>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-11 sm:h-8"
                            onClick={() => openEdit(category)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-11 sm:h-8"
                            disabled={loading}
                            onClick={() => handleDelete(category.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
              label="categories"
            />
          </div>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Category' : 'New Category'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update the category details and save your changes.'
                : 'Create a new course category.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="category-name" isRequired>
                Name
              </Label>
              <Input
                id="category-name"
                value={draft.name}
                required
                onChange={(event) => {
                  const name = event.target.value;
                  setDraft((current) => ({
                    ...current,
                    name,
                    slug: slugTouched ? current.slug : slugify(name),
                  }));
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="category-slug" isRequired>
                Slug
              </Label>
              <Input
                id="category-slug"
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
              <Label htmlFor="category-sort">Sort order</Label>
              <Input
                id="category-sort"
                inputMode="numeric"
                value={draft.sort_order}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, sort_order: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="category-is-active"
                checked={draft.is_active}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({ ...current, is_active: checked }))
                }
              />
              <Label htmlFor="category-is-active">Active</Label>
            </div>
            <DialogFooter>
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
