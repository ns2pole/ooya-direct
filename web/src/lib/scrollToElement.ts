export function scrollToElementId(id: string): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    el.focus({ preventScroll: true });
  }
  return true;
}
