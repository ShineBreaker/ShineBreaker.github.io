import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Loader, LoaderContext } from 'astro/loaders';
import { unified } from 'unified';
import uniorgParse from 'uniorg-parse';
import { extractKeywords } from 'uniorg-extract-keywords';
import uniorg2rehype from 'uniorg-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import { z } from 'astro/zod';
import { normalizeHeadings } from '../utils/excerpt';

export interface OrgLoaderOptions {
  /** Directory containing `.org` files, relative to the project root. */
  base: string;
}

/**
 * Parse an Org active timestamp (`<2026-03-03 Sun 02:46>`) or plain date
 * (`2026-03-03`) into a local-time `Date`. Missing components default to
 * midnight, matching how Hexo treated `date:` front matter.
 */
export function parseOrgDate(value: string): Date {
  const body = value.trim().replace(/^[<[]|[>\]]$/g, '');
  const match = body.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+\S+)?(?:\s+(\d{2}):(\d{2}))?/);
  if (!match) return new Date(NaN);
  const [, year, month, day, hour = '0', minute = '0'] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
}

/** Split `:tag1:tag2:` filetags into a cleaned tag list. */
function splitFiletags(value: string): string[] {
  return value
    .split(':')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/** Extract `h2`–`h6` headings (with their slug ids) from rendered HTML. */
function extractHeadings(html: string): Array<{ depth: number; slug: string; text: string }> {
  const headings: Array<{ depth: number; slug: string; text: string }> = [];
  for (const match of html.matchAll(/<h([2-6])\sid="([^"]+)">([\s\S]*?)<\/h\1>/g)) {
    headings.push({
      depth: Number(match[1]),
      slug: match[2],
      text: match[3].replace(/<[^>]+>/g, '').trim(),
    });
  }
  return headings;
}

/**
 * Custom Astro content loader that turns `.org` files into structured
 * collection entries: Org keywords become front matter, the body is rendered
 * to highlighted HTML and stored so `render(entry)` works in components.
 */
export function orgLoader(options: OrgLoaderOptions): Loader {
  // `import.meta.url` points at the compiled loader in `.astro/`; the
  // collection root is the project root that Astro resolves `base` against.
  const baseDir = resolve(process.cwd(), options.base);

  const findFiles = (): string[] => {
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = resolve(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile() && entry.name.endsWith('.org')) {
          files.push(full);
        }
      }
    };
    walk(baseDir);
    return files;
  };

  const processFile = async (file: string, context: LoaderContext) => {
    const raw = readFileSync(file, 'utf8');
    const rootDir = fileURLToPath(context.config.root);
    const filePath = relative(rootDir, file).split(sep).join('/');

    const fileData = await unified()
      .use(uniorgParse)
      .use(extractKeywords)
      .use(uniorg2rehype)
      .use(rehypeSlug)
      .use(rehypeAutolinkHeadings, {
        behavior: 'prepend',
        properties: { class: 'headerlink' },
        content: { type: 'text', value: '' },
      })
      .use(rehypeHighlight, { detect: false })
      .use(rehypeStringify)
      .process(raw);

    const keywords = fileData.data as Record<string, string | undefined>;
    const html = normalizeHeadings(String(fileData));
    const headings = extractHeadings(html);

    const data = await context.parseData({
      id: filePath,
      data: {
        title: keywords.title ?? 'UNTITLED',
        date: keywords.date ? parseOrgDate(keywords.date) : new Date(NaN),
        tags: splitFiletags(keywords.filetags ?? ''),
        categories: splitFiletags(keywords.category ?? ''),
        description: keywords.description,
      },
      filePath,
    });

    return {
      id: filePath,
      data,
      filePath,
      rendered: { html, metadata: { headings } },
    };
  };

  const load = async (context: LoaderContext): Promise<void> => {
    const files = findFiles();
    context.store.clear();
    for (const file of files) {
      try {
        context.store.set(await processFile(file, context));
      } catch (error) {
        context.logger.error(`[org-loader] failed to parse ${file}: ${String(error)}`);
      }
    }

    // Keep the dev server in sync when `.org` files change.
    const watcher = context.watcher;
    if (watcher) {
      for (const event of ['add', 'change', 'unlink'] as const) {
        watcher.on(event, (changed: string | URL) => {
          const changedPath = typeof changed === 'string' ? changed : fileURLToPath(changed);
          if (!changedPath.endsWith('.org')) return;
          void load(context);
        });
      }
    }
  };

  return {
    name: 'org-loader',
    load,
    schema: z.object({
      title: z.string().default('UNTITLED'),
      date: z.coerce.date(),
      tags: z.array(z.string()).default([]),
      categories: z.array(z.string()).default([]),
      description: z.string().optional(),
    }),
  };
}
