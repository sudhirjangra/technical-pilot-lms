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

/**
 * Sanitizes raw slug input while typing: lowercases and strips disallowed
 * characters, while preserving both hyphen and underscore so editors can
 * continue typing slug segments without the browser blocking them.
 * Use `slugify` for final normalization before persisting.
 */
export function sanitizeSlugInput(value: string): string {
  return value
    .toString()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/g, '');
}
