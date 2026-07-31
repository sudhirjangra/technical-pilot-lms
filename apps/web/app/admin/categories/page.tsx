import { getCategories } from '@/server/admin/categories.server';
import { CategoriesClient } from '@/components/admin/categories-client';

export default async function AdminCategoriesPage() {
  const categories = await getCategories();
  return <CategoriesClient categories={categories} />;
}
