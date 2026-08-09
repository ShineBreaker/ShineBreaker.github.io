import type { CollectionEntry } from 'astro:content';

/** Posts per page, matching the original `index_generator.per_page`. */
export const PAGE_SIZE = 10;

/** Most-recent-first ordering used by every listing. */
export function sortPosts(posts: CollectionEntry<'posts'>[]): CollectionEntry<'posts'>[] {
  return [...posts].sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}
