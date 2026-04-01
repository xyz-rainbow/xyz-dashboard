/** Hides the static HTML boot splash after config load (matches `.boot-splash--hide` transition). */
const SPLASH_REMOVE_AFTER_MS = 400;

export async function runBootWithSplash(
  loadConfig: () => Promise<void>
): Promise<void> {
  try {
    await loadConfig();
  } finally {
    const el = document.getElementById('boot-splash');
    if (!el) return;
    el.classList.add('boot-splash--hide');
    el.setAttribute('aria-busy', 'false');
    window.setTimeout(() => {
      el.remove();
    }, SPLASH_REMOVE_AFTER_MS);
  }
}
