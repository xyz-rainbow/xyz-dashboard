/**
 *  _____             _           _                          
 * |  __ \           (_)         | |                         
 * | |__) | __ _ _ __  _ __  _ __| |__   ___   __ _ _   _   
 * |  _  / / _` | '  \| | '_ \| '_ \ '_ \ / _ \ / _` | | | |  
 * | | \ \| (_| | | | | | | | | |_) | | | (_) | (_| | |_| |  
 * |_|  \_\\__,_|_| |_|_|_| |_|_.__/|_| |_|\___/ \__, |\__, |  
 *                                                __/ | __/ | 
 *                                               |___/ |___/  
 * 
 * Aplicación Principal - XYZ Dashboard
 * #xyz-rainbow #xyz-rainbowtechnology #rainbowtechnology.xyz
 */

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
import { applyThemeMode } from './themePresets';
import { runBootWithSplash } from './bootSplash';

export default function App() {
  const settingsOpen = useStore((s) => s.settingsOpen);
  const setError = useStore((s) => s.setError);
  const loadConfig = useStore((s) => s.loadConfig);
  const themePreset = useStore((s) => s.themePreset);
  const multicolorThemes = useStore((s) => s.multicolorThemes);
  const { fadeOpacityRef, resetInactivity } = useInactivityTimer();
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Gestión del arrastre de la ventana
  useWindowDrag(panelRef);

  useEffect(() => {
    // Iniciar con pantalla de carga (Splash)
    void runBootWithSplash(loadConfig);
  }, [loadConfig]);

  useEffect(() => {
    // Aplicar tema visual
    applyThemeMode(themePreset, multicolorThemes);
  }, [themePreset, multicolorThemes]);

  useEffect(() => {
    // Desbloquear audio tras la primera interacción
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
    // Calentar audio al recuperar visibilidad o foco
    const onVisible = () => {
      if (document.visibilityState === 'visible') void warmupAudio();
    };
    const onFocus = () => {
      void warmupAudio();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    // Escuchar eventos de visibilidad de Tauri
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
    // Sonido de clic en elementos interactivos
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
    // Animación de desvanecimiento por inactividad
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
    // Evitar desvanecimiento cuando los ajustes están abiertos
    if (containerRef.current) {
      containerRef.current.style.opacity = '1';
    }
    resetInactivity();
  }, [settingsOpen, resetInactivity]);

  // Ocultar ventana del dashboard
  const hideWindow = useCallback(() => {
    void playCloseSfx().catch(() => undefined);
    invoke('hide_window').catch((error) => {
      console.warn('Failed to hide window:', error);
    });
  }, []);

  useEffect(() => {
    // ESC / Ctrl+C → cerrar dashboard (si los ajustes están cerrados)
    const handler = (e: KeyboardEvent) => {
      if (settingsOpen) return;
      if (e.key === 'Escape' || (e.ctrlKey && e.key === 'c')) {
        e.preventDefault();
        hideWindow();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [settingsOpen, hideWindow]);

  // Click fuera del panel → cerrar dashboard
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (settingsOpen) return;
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
