/**
 * Generates an SEO-friendly slug from a string.
 */
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w-]+/g, '')   // Remove all non-word chars
    .replace(/--+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')        // Trim - from start of text
    .replace(/-+$/, '');       // Trim - from end of text
};

/**
 * Generates a full SEO product slug including product name and ID.
 */
export const getProductSlug = (title: string, id: string | number): string => {
  const baseSlug = slugify(title);
  return `${baseSlug}-price-in-ethiopia-${id}`;
};

/**
 * Extracts the ID from a product slug.
 */
export const getIdFromSlug = (slug: string): string | null => {
  const marker = '-price-in-ethiopia-';
  const index = slug.lastIndexOf(marker);
  if (index !== -1) {
    return slug.substring(index + marker.length);
  }
  
  // Fallback for old slugs or if format changes
  const parts = slug.split('-');
  return parts[parts.length - 1] || null;
};
