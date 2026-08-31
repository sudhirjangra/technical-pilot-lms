/**
 * Converts arbitrary text into a kebab-case slug (lowercase letters, numbers,
 * single hyphens as separators, no leading/trailing hyphens).
 */
export function slugify(value: string): string {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
