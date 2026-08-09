import type { CollectionEntry } from 'astro:content';

/** Entry id (`src/content/posts/<name>.org`) → `<name>` URL slug. */
export function postSlug(entry: CollectionEntry<'posts'>): string {
  return entry.id.replace(/^src\/content\/posts\//, '').replace(/\.org$/, '');
}

/** Canonical post URL. */
export function postUrl(entry: CollectionEntry<'posts'>): string {
  return `/posts/${encodeURIComponent(postSlug(entry))}/`;
}
