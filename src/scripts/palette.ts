const STORAGE_KEY = 'ascii-orbit.palette';

function options(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('[data-palette-option]'));
}

function selectedOption(id: string): HTMLButtonElement | undefined {
  return options().find((option) => option.dataset.paletteId === id);
}

function currentPalette(): string {
  return document.documentElement.dataset.palette || options()[0]?.dataset.paletteId || 'gruvbox-dark-hard';
}

function updateUi(id: string): void {
  const option = selectedOption(id) || options()[0];
  if (!option) return;

  document.querySelectorAll<HTMLElement>('[data-current-palette-name]').forEach((label) => {
    label.textContent = option.dataset.paletteName || id;
  });
  options().forEach((item) => item.setAttribute('aria-current', String(item === option)));
}

export function mountPaletteSelector(): void {
  updateUi(currentPalette());

  const menu = document.querySelector<HTMLElement>('[data-palette-menu]');
  const trigger = document.querySelector<HTMLButtonElement>('.toolbar-palette-trigger');
  const supportsPopover = typeof HTMLElement.prototype.showPopover === 'function';

  if (menu && trigger && !supportsPopover) {
    trigger.addEventListener('click', () => menu.classList.toggle('is-open'));
  }

  options().forEach((option) => {
    option.addEventListener('click', () => {
      const id = option.dataset.paletteId;
      if (!id || id === currentPalette()) return;

      try { localStorage.setItem(STORAGE_KEY, id); } catch (_) { /* storage is optional */ }
      window.location.reload();
    });
  });
}
