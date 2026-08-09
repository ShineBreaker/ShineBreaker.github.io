/**
 * Plain-text excerpt and heading normalization for rendered HTML.
 * Ported from the Hexo theme's `scripts/excerpt.js` with the `hexo.extend`
 * boundaries removed.
 */

export function toPlainText(html: string): string {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** First `limit` characters of the plain-text form of `html`. */
export function postExcerpt(html: string, limit: number = 220): string {
  const text = toPlainText(html);
  return text.length > limit ? `${text.slice(0, limit).trimEnd()} …` : text;
}

/**
 * Shift every heading one level deeper (h1 → h2 … h6 stays h6) so a post can
 * keep a single page-level `h1` while its body headings start at `h2`, and
 * make headerlink anchors invisible to assistive tech.
 */
export function normalizeHeadings(html: string): string {
  return String(html || '')
    .replace(/<(\/?)h([1-6])(\b[^>]*)>/gi, (_, closing: string, level: string, attributes: string) => {
      return `<${closing}h${Math.min(Number(level) + 1, 6)}${attributes}>`;
    })
    .replace(/<a([^>]*\bclass="headerlink"[^>]*)><\/a>/gi, '<a$1 aria-hidden="true" tabindex="-1"></a>');
}
