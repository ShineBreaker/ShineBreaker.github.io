import type { CollectionEntry } from 'astro:content';

export interface Taxonomy {
  name: string;
  count: number;
  posts: CollectionEntry<'posts'>[];
}

/** Group posts by their `tags` or `categories` field. */
export function aggregate(posts: CollectionEntry<'posts'>[], key: 'tags' | 'categories'): Map<string, Taxonomy> {
  const map = new Map<string, Taxonomy>();
  for (const post of posts) {
    for (const name of (post.data[key] ?? []) as string[]) {
      const entry = map.get(name) ?? { name, count: 0, posts: [] };
      entry.count += 1;
      entry.posts.push(post);
      map.set(name, entry);
    }
  }
  return map;
}
