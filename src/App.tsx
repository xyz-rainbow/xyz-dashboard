import { useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useStore } from './store';
import { useInactivityTimer } from './hooks/useInactivityTimer';
import { useWindowDrag } from './hooks/useWindowDrag';
import MacroGrid from './components/MacroGrid';
import GridControls from './components/GridControls';
import SettingsIcon from './components/SettingsIcon';
import SettingsPanel from './components/SettingsPanel';
import ErrorOverlay from './components/ErrorOverlay';
import { playCloseSfx, playOpenSfx, playTapSfx, warmupAudio } from './audio/sfx';

export default function App() {
  const settingsOpen = useStore((s) => s.settingsOpen);
  const setError = useStore((s) => s.setError);
  const loadConfig = useStore((s) => s.loadConfig);
  const { fadeOpacityRef, resetInactivity } = useInactivityTimer();
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useWindowDrag(panelRef);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    const unlockAudio = () => {
      void warmupAudio().catch((error) => {
        console.warn('Failed to unlock audio context:', error);
      });
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  useEffect(() => {
    const unlistenPromise = listen<{ visible: boolean }>(
      'dashboard-visibility-changed',
      (event) => {
        if (event.payload?.visible) {
          void playOpenSfx().catch(() => undefined);
        } else {
          void playCloseSfx().catch(() => undefined);
        }
      }
    );
    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (
        target.closest('button') ||
        target.closest('[role="switch"]') ||
        target.closest('select') ||
        target.closest('input[type="range"]')
      ) {
        void playTapSfx().catch(() => undefined);
      }
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => window.removeEventListener('pointerdown', onPointerDown, true);
  }, []);

  useEffect(() => {
    let animationFrame = 0;
    let lastOpacity = -1;
    const tick = () => {
      const nextOpacity = fadeOpacityRef.current;
      if (containerRef.current && nextOpacity !== lastOpacity) {
        containerRef.current.style.opacity = String(nextOpacity);
        lastOpacity = nextOpacity;
      }
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [fadeOpacityRef]);

  useEffect(() => {
    // Avoid residual fade visual when opening/closing settings.
    if (containerRef.current) {
      containerRef.current.style.opacity = '1';
    }
    resetInactivity();
  }, [settingsOpen, resetInactivity]);

  // ESC / Ctrl+C → close dashboard (unless settings are open)
  const hideWindow = useCallback(() => {
    void playCloseSfx().catch(() => undefined);
    invoke('hide_window').catch((error) => {
      console.warn('Failed to hide window:', error);
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (settingsOpen) return; // let settings handle ESC
      if (e.key === 'Escape' || (e.ctrlKey && e.key === 'c')) {
        e.preventDefault();
        hideWindow();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [settingsOpen, hideWindow]);

  // Click outside the panel → close dashboard
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (settingsOpen) return;
      // If click is on the outer div (outside the glass panel), hide
      if (e.target === containerRef.current) {
        hideWindow();
      }
    },
    [settingsOpen, hideWindow]
  );

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center"
      onMouseDown={handleMouseDown}
    >
      <div
        ref={panelRef}
        className="glass-panel w-full h-full flex flex-col relative overflow-hidden"
        onMouseEnter={() => setError(null)}
      >
        <div className="flex-1 flex items-center justify-center">
          <MacroGrid />
        </div>

        <GridControls />
        <SettingsIcon />
        <ErrorOverlay />
        <SettingsPanel />
      </div>
    </div>
  );
}
