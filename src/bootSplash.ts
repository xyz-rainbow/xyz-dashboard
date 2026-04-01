/**
 *  __   __  ________
 *  \ \ / / |___  __/
 *   \ V /      / /   
 *    > <      / /    
 *   / ^ \    / /___  
 *  /_/ \_\  /______/ 
 * 
 * Sistema de Splash Screen - XYZ Dashboard
 * #xyz-rainbow #xyz-rainbowtechnology #rainbowtechnology.xyz
 */

import { listen } from '@tauri-apps/api/event';

const MIN_VISIBLE_MS = 520;
const FADE_MS = 340;

let splashDismissed = false;

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** 
 * Espera hasta que la ventana principal sea visible (o inmediatamente en desarrollo web / sin Tauri).
 */
async function waitForDashboardVisibleSince(): Promise<number> {
  if (!isTauriRuntime()) {
    return performance.now();
  }
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const win = getCurrentWindow();
    if (await win.isVisible()) {
      return performance.now();
    }
    return await new Promise<number>((resolve) => {
      void (async () => {
        let settled = false;
        let unlistenRef: (() => void) | null = null;
        const settle = () => {
          if (settled) return;
          settled = true;
          try {
            unlistenRef?.();
          } finally {
            unlistenRef = null;
          }
          resolve(performance.now());
        };
        try {
          unlistenRef = await listen<{ visible: boolean }>(
            'dashboard-visibility-changed',
            (event) => {
              if (event.payload?.visible) settle();
            },
          );
          if (await win.isVisible()) settle();
        } catch {
          settle();
        }
      })();
    });
  } catch {
    return performance.now();
  }
}

/**
 * Ejecuta el trabajo de arranque asíncrono, espera hasta que la ventana sea visible
 * (para que el usuario vea el logo), mantiene el splash al menos MIN_VISIBLE_MS
 * después de eso, y luego lo desvanece.
 */
export async function runBootWithSplash(load: () => Promise<void>): Promise<void> {
  if (splashDismissed) {
    await load();
    return;
  }
  let visibleAt = performance.now();
  try {
    await Promise.all([
      load(),
      waitForDashboardVisibleSince().then((t) => {
        visibleAt = t;
      }),
    ]);
  } finally {
    if (splashDismissed) return;
    const sinceVisible = performance.now() - visibleAt;
    if (sinceVisible < MIN_VISIBLE_MS) {
      await new Promise((r) => setTimeout(r, MIN_VISIBLE_MS - sinceVisible));
    }
    if (splashDismissed) return;
    splashDismissed = true;
    const el = document.getElementById('boot-splash');
    if (!el) return;
    el.classList.add('boot-splash--hide');
    el.setAttribute('aria-busy', 'false');
    await new Promise<void>((resolve) => {
      const finish = () => resolve();
      el.addEventListener('transitionend', finish, { once: true });
      window.setTimeout(finish, FADE_MS + 80);
    });
    el.remove();
  }
}
