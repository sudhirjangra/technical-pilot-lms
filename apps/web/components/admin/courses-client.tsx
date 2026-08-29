'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Course, createCourse, deleteCourse } from '@/server/admin/courses.server';
import { Category } from '@/server/admin/categories.server';
import { Button } from '@repo/shadcn/button';
import { Card } from '@repo/shadcn/card';
import { Badge } from '@repo/shadcn/badge';
import { toast } from '@repo/shadcn/sonner';
import { slugify } from '@repo/utils';

export function CoursesClient({ courses, categories }: { courses: Course[]; categories: Category[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createCourse({
      title: fd.get('title') as string,
      slug: slugify(fd.get('slug') as string),
      description: fd.get('description') as string,
      category_id: fd.get('category_id') as string || undefined,
      price: Number(fd.get('price')),
      discount_price: fd.get('discount_price') ? Number(fd.get('discount_price')) : undefined,
      status: fd.get('status') as string,
    });
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Course created');
      setShowForm(false);
      setSlug('');
      setSlugTouched(false);
      router.refresh();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this course?')) return;
    const result = await deleteCourse(id);
    if (result.error) toast.error(result.error);
    else {
      toast.success('Course deleted');
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Courses</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Course'}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <input
              name="title"
              placeholder="Title"
              required
              className="border rounded px-3 py-2 col-span-2"
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
            <select name="category_id" className="border rounded px-3 py-2">
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input name="price" type="number" placeholder="Price" required className="border rounded px-3 py-2" />
            <input name="discount_price" type="number" placeholder="Discount price (optional)" className="border rounded px-3 py-2" />
            <select name="status" required className="border rounded px-3 py-2">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <textarea name="description" placeholder="Description" className="border rounded px-3 py-2 col-span-2" rows={3} />
            <Button type="submit" disabled={loading} className="col-span-2">
              {loading ? 'Creating...' : 'Create Course'}
            </Button>
          </form>
        </Card>
      )}

      <div className="grid gap-4">
        {courses.length === 0 && <p className="text-muted-foreground">No courses yet.</p>}
        {courses.map((course) => (
          <Card key={course.id} className="p-4 flex items-center justify-between">
            <Link href={`/admin/courses/${course.id}`} className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{course.title}</h3>
                <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                  {course.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                ₹{course.price}{course.discount_price ? ` → ₹${course.discount_price}` : ''}
                {course.categories ? ` • ${course.categories.name}` : ''}
              </p>
            </Link>
            <Button variant="destructive" size="sm" onClick={() => handleDelete(course.id)}>
              Delete
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
