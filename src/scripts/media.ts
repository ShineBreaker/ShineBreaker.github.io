export function mountMedia(): void {
  document.querySelectorAll<HTMLImageElement>('.post-content img').forEach((image) => {
    image.addEventListener('click', () => {
      const dialog = document.createElement('dialog');
      dialog.className = 'media-dialog';
      const enlarged = image.cloneNode(true) as HTMLImageElement;
      enlarged.removeAttribute('id');
      dialog.append(enlarged);
      dialog.addEventListener('click', () => dialog.close(), { once: true });
      dialog.addEventListener('close', () => dialog.remove(), { once: true });
      document.body.append(dialog);
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else window.open(image.currentSrc || image.src, '_blank', 'noopener');
    });
  });
}
