const SLUG_SUFFIX_PATTERN = /-([a-f0-9]{8})$/i;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function slugifyProductName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
}

export function buildProductSlug(name: string, id: string): string {
  const base = slugifyProductName(name);
  const suffix = id.replace(/-/g, '').slice(0, 8).toLowerCase();

  if (!base) {
    return id;
  }

  return `${base}-${suffix}`;
}

export function extractProductIdPrefixFromSlug(slug: string): string | null {
  if (UUID_PATTERN.test(slug)) {
    return slug;
  }

  const match = slug.match(SLUG_SUFFIX_PATTERN);
  return match?.[1]?.toLowerCase() ?? null;
}
