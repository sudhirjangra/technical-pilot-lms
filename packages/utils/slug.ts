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
 * characters, but preserves trailing/consecutive hyphens and underscores so
 * they aren't stripped mid-keystroke. Use `slugify` for final normalization.
 */
export function sanitizeSlugInput(value: string): string {
  return value
    .toString()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/g, '');
}
