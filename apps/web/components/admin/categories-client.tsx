'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Category, createCategory, deleteCategory } from '@/server/admin/categories.server';
import { Button } from '@repo/shadcn/button';
import { Card } from '@repo/shadcn/card';
import { Badge } from '@repo/shadcn/badge';
import { toast } from '@repo/shadcn/sonner';
import { slugify } from '@repo/utils';

export function CategoriesClient({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createCategory({
      name: fd.get('name') as string,
      slug: slugify(fd.get('slug') as string),
      description: fd.get('description') as string || undefined,
      sort_order: Number(fd.get('sort_order')) || 0,
      is_active: true,
    });
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Category created');
      setShowForm(false);
      setSlug('');
      setSlugTouched(false);
      router.refresh();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    const result = await deleteCategory(id);
    if (result.error) toast.error(result.error);
    else {
      toast.success('Category deleted');
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Category'}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <input
              name="name"
              placeholder="Name"
              required
              className="border rounded px-3 py-2"
              onChange={(e) => {
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
            />
            <input
              name="slug"
              placeholder="slug-like-this"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              className="border rounded px-3 py-2"
            />
            <input name="sort_order" type="number" placeholder="Sort order" className="border rounded px-3 py-2" />
            <input name="description" placeholder="Description (optional)" className="border rounded px-3 py-2" />
            <Button type="submit" disabled={loading} className="col-span-2">
              {loading ? 'Creating...' : 'Create Category'}
            </Button>
          </form>
        </Card>
      )}

      <div className="grid gap-3">
        {categories.length === 0 && <p className="text-muted-foreground">No categories yet.</p>}
        {categories.map((cat) => (
          <Card key={cat.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">{cat.name}</span>
              <Badge variant={cat.is_active ? 'default' : 'secondary'}>
                {cat.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <span className="text-xs text-muted-foreground">/{cat.slug}</span>
            </div>
            <Button variant="destructive" size="sm" onClick={() => handleDelete(cat.id)}>
              Delete
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
