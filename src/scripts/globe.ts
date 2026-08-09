type GlobeMode = 'corner' | 'article';

type GlobeController = {
  pause(): void;
  resume(): void;
  destroy(): void;
};

type RenderedGlobe = {
  coast: string;
  composite: string;
  land: string;
  ocean: string;
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function dimensions(mode: GlobeMode): { columns: number; rows: number } {
  // Departure Mono's rendered cells are roughly 0.58 as wide as they are tall. The
  // column/row ratios below compensate for that so the projected disc is
  // circular in CSS pixels rather than merely circular in the character grid.
  if (mode === 'article') return window.innerWidth < 700 ? { columns: 63, rows: 37 } : { columns: 87, rows: 51 };
  return window.innerWidth < 700 ? { columns: 25, rows: 15 } : { columns: 35, rows: 21 };
}

export function mountAsciiGlobe(host: HTMLElement): GlobeController {
  const frame = host.querySelector<HTMLElement>('[data-ascii-globe-frame]');
  const fallback = host.querySelector<HTMLElement>('[data-globe-fallback]');
  const layers = {
    coast: host.querySelector<HTMLElement>('[data-globe-layer="coast"]'),
    land: host.querySelector<HTMLElement>('[data-globe-layer="land"]'),
    ocean: host.querySelector<HTMLElement>('[data-globe-layer="ocean"]')
  };
  const mode = (host.dataset.globeMode === 'article' ? 'article' : 'corner') as GlobeMode;
  if (!frame || typeof Worker === 'undefined') {
    return { pause() {}, resume() {}, destroy() {} };
  }

  const worker = new Worker(new URL('./globe.worker.ts', import.meta.url), { type: 'module' });
  const frameInterval = 1000 / (mode === 'article' ? (window.innerWidth < 700 ? 12 : 18) : 12);
  let animationFrame = 0;
  let lastFrame = 0;
  let isVisible = !document.hidden;
  let isPaused = document.documentElement.dataset.globePaused === 'true';
  let destroyed = false;

  const renderFrame = (phase: number) => {
    const size = dimensions(mode);
    frame.style.setProperty('--globe-width', `${size.columns}ch`);
    frame.style.setProperty('--globe-height', `${size.rows}em`);
    worker.postMessage({ type: 'render', ...size, phase, article: mode === 'article' });
  };

  const requestFrame = (timestamp: number) => {
    if (destroyed || isPaused || !isVisible || document.hidden || reducedMotion.matches) return;
    if (timestamp - lastFrame >= frameInterval) {
      lastFrame = timestamp;
      renderFrame(timestamp / 9000);
    }
    animationFrame = window.requestAnimationFrame(requestFrame);
  };

  const start = () => {
    window.cancelAnimationFrame(animationFrame);
    if (!destroyed && !isPaused && isVisible && !document.hidden && !reducedMotion.matches) animationFrame = window.requestAnimationFrame(requestFrame);
  };
  const stop = () => window.cancelAnimationFrame(animationFrame);
  const onVisibility = () => { if (document.hidden) stop(); else start(); };
  const onReducedMotion = () => {
    if (reducedMotion.matches) stop();
    else start();
  };

  worker.addEventListener('message', (event: MessageEvent<RenderedGlobe>) => {
    frame.dataset.globeText = event.data.composite;
    frame.dataset.enhanced = 'true';
    if (fallback) fallback.hidden = true;
    if (layers.coast) layers.coast.textContent = event.data.coast;
    if (layers.land) layers.land.textContent = event.data.land;
    if (layers.ocean) layers.ocean.textContent = event.data.ocean;
  });
  document.addEventListener('visibilitychange', onVisibility);
  reducedMotion.addEventListener('change', onReducedMotion);

  const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    if (isVisible) start(); else stop();
  });
  observer?.observe(host);
  if (reducedMotion.matches) renderFrame(0);
  else start();

  return {
    pause() { isPaused = true; stop(); },
    resume() { isPaused = false; start(); },
    destroy() {
      destroyed = true;
      stop();
      observer?.disconnect();
      worker.terminate();
      document.removeEventListener('visibilitychange', onVisibility);
      reducedMotion.removeEventListener('change', onReducedMotion);
    }
  };
}
