import '../styles/main.css';
import { mountAsciiGlobe } from './globe';
import { mountMedia } from './media';
import { mountPaletteSelector } from './palette';
import { mountSearch } from './search';

mountPaletteSelector();
mountSearch();
mountMedia();

const globes = Array.from(document.querySelectorAll<HTMLElement>('[data-ascii-globe]')).map(mountAsciiGlobe);
const globeToggle = document.querySelector<HTMLButtonElement>('[data-globe-toggle]');

function syncGlobeToggle(paused: boolean): void {
  document.documentElement.dataset.globePaused = String(paused);
  globeToggle?.setAttribute('aria-pressed', String(paused));
  globeToggle?.setAttribute('aria-label', paused ? '继续 ASCII 地球' : '暂停 ASCII 地球');
  if (globeToggle) globeToggle.textContent = paused ? '[>]' : '[||]';
}

if (globeToggle && globes.length) {
  let paused = false;
  globeToggle.addEventListener('click', () => {
    paused = !paused;
    try { sessionStorage.setItem('ascii-orbit.globe-paused', String(paused)); } catch (_) { /* optional */ }
    syncGlobeToggle(paused);
    globes.forEach((globe) => paused ? globe.pause() : globe.resume());
  });
  try { paused = sessionStorage.getItem('ascii-orbit.globe-paused') === 'true'; } catch (_) { /* optional */ }
  if (paused) { syncGlobeToggle(true); globes.forEach((globe) => globe.pause()); }
}
