const usedSlugs = new Map<string, number>();

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const count = usedSlugs.get(base) || 0;
  usedSlugs.set(base, count + 1);

  return count === 0 ? base : `${base}-${count + 1}`;
}

export function resetSlugs(): void {
  usedSlugs.clear();
}
