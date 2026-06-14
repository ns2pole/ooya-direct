export function scrollToElementId(id: string, focusId?: string): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const focusTarget = focusId ? document.getElementById(focusId) : el;
  if (focusTarget instanceof HTMLTextAreaElement || focusTarget instanceof HTMLInputElement) {
    focusTarget.focus({ preventScroll: true });
  }
  return true;
}
