import { defineCollection } from 'astro:content';
import { orgLoader } from './loaders/org-loader';

const posts = defineCollection({
  loader: orgLoader({ base: './src/content/posts' }),
});

export const collections = { posts };
