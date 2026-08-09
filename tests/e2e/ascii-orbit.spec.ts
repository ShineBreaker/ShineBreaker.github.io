import { expect, test, type Page } from '@playwright/test';

type GlobeMetrics = {
  aspectRatio: number;
  fillRatio: number;
  frame: { bottom: number; left: number; right: number; top: number; width: number };
  text: string;
  viewport: { height: number; width: number };
};

async function readGlobeMetrics(page: Page, mode: 'corner' | 'article'): Promise<GlobeMetrics> {
  const frame = page.locator(`[data-globe-mode="${mode}"] [data-ascii-globe-frame]`);
  await expect(frame).toContainText(/\S/);
  await page.evaluate(() => document.fonts.ready);

  return frame.evaluate((element) => {
    const text = element.dataset.globeText ?? element.textContent ?? '';
    const lines = text.split('\n');
    const occupiedLines = lines.filter((line) => /\S/.test(line));
    const occupiedColumns = Math.max(...occupiedLines.map((line) => line.search(/\s*$/)));
    const occupiedCells = occupiedLines.reduce((total, line) => total + (line.match(/\S/g)?.length ?? 0), 0);
    const rect = element.getBoundingClientRect();

    return {
      aspectRatio: rect.width / rect.height,
      fillRatio: occupiedCells / (occupiedColumns * occupiedLines.length),
      frame: { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top, width: rect.width },
      text,
      viewport: { height: window.innerHeight, width: window.innerWidth }
    };
  });
}

test('home renders terminal log stream, toolbar and corner globe', async ({ page }, testInfo) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'LATEST LOGS' })).toBeVisible();
  await expect(page.locator('.post-card')).toHaveCount(3);
  await expect(page.locator('.post-card h2')).toHaveText([
    /AI 工作流进化史/,
    /Windows\/Linux/,
    /新年伊始/
  ]);
  await expect(page.locator('[data-ascii-globe][data-globe-mode="corner"]')).toHaveCount(1);
  await expect(page.locator('.site-footer')).not.toContainText('built with');
  await expect(page.locator('.toolbar-shell')).toHaveCSS('border-radius', '0px');
  await expect(page.locator('.post-card').first()).toHaveCSS('border-radius', '0px');
  const strayToolbarRail = await page.locator('.toolbar-shell').evaluate((element) => {
    const before = getComputedStyle(element, '::before');
    const after = getComputedStyle(element, '::after');
    return before.content !== 'none' || after.content !== 'none';
  });
  expect(strayToolbarRail).toBe(false);

  const fontFamily = await page.locator('.toolbar-brand').evaluate((element) => getComputedStyle(element).fontFamily);
  expect(fontFamily).toContain('Departure Mono UI');

  if (testInfo.project.name === 'chromium') {
    const textCenters = await page.locator('.toolbar-shell').evaluate(() => {
      const center = (selector: string): number => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`Missing toolbar element: ${selector}`);
        const range = document.createRange();
        range.selectNodeContents(element);
        const rect = range.getBoundingClientRect();
        return rect.top + rect.height / 2;
      };
      return [center('.toolbar-brand'), center('.toolbar-link'), center('.toolbar-palette-trigger')];
    });
    expect(Math.max(...textCenters) - Math.min(...textCenters)).toBeLessThanOrEqual(1);
  }
});

test('palette choice persists through the required full reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '切换配色' }).click();
  await page.getByRole('button', { name: 'Nord', exact: true }).click();

  await expect(page.locator('html')).toHaveAttribute('data-palette', 'nord');
  await expect(page.locator('[data-current-palette-name]')).toHaveText('Nord');
});

test('article keeps one primary heading inside the centered globe stage', async ({ page }) => {
  await page.goto('/posts/2026-05-15/');

  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('.article-stage [data-globe-mode="article"]')).toHaveCount(1);
  await expect(page.locator('.post-sheet[data-pagefind-body]')).toBeVisible();
  await expect(page.locator('.ascii-globe--article')).toHaveCSS('z-index', '0');
  await expect(page.locator('.ascii-globe__aperture')).toHaveCount(0);
  await expect(page.locator('.post-title-arrow')).toHaveCount(2);

  const articleGeometry = await page.evaluate(() => {
    const globe = document.querySelector<HTMLElement>('.ascii-globe--article');
    const frame = document.querySelector<HTMLElement>('.ascii-globe--article .ascii-globe__frame');
    const title = document.querySelector<HTMLElement>('#post-title');
    const arrows = Array.from(document.querySelectorAll<HTMLElement>('.post-title-arrow'));
    if (!globe || !frame || !title || arrows.length !== 2) throw new Error('Missing article stage elements');
    const titleRect = title.getBoundingClientRect();
    return {
      frameCenterX: frame.getBoundingClientRect().left + frame.getBoundingClientRect().width / 2,
      frameCenterY: frame.getBoundingClientRect().top + frame.getBoundingClientRect().height / 2,
      frameWidth: frame.getBoundingClientRect().width,
      viewportWidth: window.innerWidth,
      viewportCenterX: window.innerWidth / 2,
      viewportCenterY: window.innerHeight / 2,
      maskImage: getComputedStyle(globe).maskImage,
      titleBefore: getComputedStyle(title, '::before').content,
      titleAfter: getComputedStyle(title, '::after').content,
      titleCenter: titleRect.top + titleRect.height / 2,
      arrowCenters: arrows.map((arrow) => {
        const rect = arrow.getBoundingClientRect();
        return rect.top + rect.height / 2;
      })
    };
  });
  expect(articleGeometry.frameWidth).toBeGreaterThan(articleGeometry.viewportWidth);
  expect(Math.abs(articleGeometry.frameCenterX - articleGeometry.viewportCenterX)).toBeLessThanOrEqual(1);
  expect(Math.abs(articleGeometry.frameCenterY - articleGeometry.viewportCenterY)).toBeLessThanOrEqual(1);
  expect(articleGeometry.maskImage).not.toBe('none');
  expect(articleGeometry.titleBefore).toBe('none');
  expect(articleGeometry.titleAfter).toBe('none');
  articleGeometry.arrowCenters.forEach((center) => {
    expect(Math.abs(center - articleGeometry.titleCenter)).toBeLessThanOrEqual(1);
  });
});

test('globe has a round silhouette with distinct land, coast and ocean layers', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'desktop geometry and glyph metrics');

  await page.goto('/');
  const corner = await readGlobeMetrics(page, 'corner');
  expect(corner.aspectRatio).toBeGreaterThanOrEqual(0.9);
  expect(corner.aspectRatio).toBeLessThanOrEqual(1.1);
  expect(corner.text).toContain('~');
  expect(corner.text).toContain('#');
  expect(corner.text).toMatch(/[@*]/);
  expect(corner.text).not.toMatch(/[|+]/);
  await expect(page.locator('[data-globe-mode="corner"] [data-globe-layer]')).toHaveCount(3);
  const layerColors = await page.locator('[data-globe-mode="corner"] [data-globe-layer]').evaluateAll((layers) => (
    layers.map((layer) => getComputedStyle(layer).color)
  ));
  expect(new Set(layerColors).size).toBe(3);

  await page.goto('/posts/2026-05-15/');
  const article = await readGlobeMetrics(page, 'article');
  expect(article.aspectRatio).toBeGreaterThanOrEqual(0.9);
  expect(article.aspectRatio).toBeLessThanOrEqual(1.1);
  expect(article.fillRatio).toBeGreaterThan(0.25);
  expect(article.fillRatio).toBeLessThan(0.72);
  expect(article.frame.left).toBeGreaterThan(-article.viewport.width * 0.12);
  expect(article.frame.right).toBeLessThan(article.viewport.width * 1.12);
  expect(article.text).toContain('~');
  expect(article.text).toContain('#');
  expect(article.text).toMatch(/[@*]/);
  expect(article.text).not.toMatch(/[|+]/);
});

test('mobile toolbar touches both viewport edges, keeps full palette names and does not overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'mobile-specific geometry');
  await page.goto('/');

  await expect(page.locator('.toolbar-palette-trigger')).toBeVisible();
  const bounds = await page.locator('.site-toolbar').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, width: rect.width };
  });
  expect(bounds.left).toBe(0);
  expect(bounds.right).toBe(bounds.width);

  await page.getByRole('button', { name: '切换配色' }).click();
  await expect(page.getByRole('button', { name: 'Solarized Dark', exact: true })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
