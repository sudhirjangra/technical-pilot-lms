import { getCategories } from '@/server/admin/categories.server';
import { CategoriesClient } from '@/components/admin/categories-client';
import { requireAdminPermission } from '@/server/admin/permissions.server';

export default async function AdminCategoriesPage() {
  await requireAdminPermission('courses:read', 'courses:write');
  const categories = await getCategories(true);
  return <CategoriesClient categories={categories} />;
}
