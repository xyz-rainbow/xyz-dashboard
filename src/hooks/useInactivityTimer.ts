import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { invoke } from '@tauri-apps/api/core';

export function useInactivityTimer() {
  const inactivityTimeout = useStore((s) => s.inactivityTimeout);
  const fadeOutDuration = useStore((s) => s.fadeOutDuration);
  const settingsOpen = useStore((s) => s.settingsOpen);
  const fadeOpacityRef = useRef(1);
  const animFrameRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fadeStartRef = useRef(0);

  const hideWindow = useCallback(async () => {
    try {
      await invoke('hide_window');
    } catch {
      // ignore
    }
  }, []);

  const cancelFade = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    clearTimeout(timerRef.current);
    fadeOpacityRef.current = 1;
    fadeStartRef.current = 0;
  }, []);

  const startFadeOut = useCallback(() => {
    fadeStartRef.current = performance.now();
    const duration = fadeOutDuration * 1000;

    const tick = (now: number) => {
      const elapsed = now - fadeStartRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Exponential fade: steeper in first half
      const opacity = Math.pow(1 - progress, 2.5);
      fadeOpacityRef.current = opacity;

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        hideWindow();
        fadeOpacityRef.current = 1;
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [fadeOutDuration, hideWindow]);

  const resetTimer = useCallback(() => {
    cancelFade();
    fadeOpacityRef.current = 1;
    if (settingsOpen) return;

    timerRef.current = setTimeout(() => {
      startFadeOut();
    }, inactivityTimeout * 1000);
  }, [inactivityTimeout, settingsOpen, cancelFade, startFadeOut]);

  useEffect(() => {
    resetTimer();

    const onActivity = () => {
      resetTimer();
    };

    window.addEventListener('mousemove', onActivity);
    window.addEventListener('mouseenter', onActivity);
    window.addEventListener('pointerdown', onActivity);
    window.addEventListener('click', onActivity);
    window.addEventListener('keydown', onActivity);

    return () => {
      cancelFade();
      clearTimeout(timerRef.current);
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('mouseenter', onActivity);
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('click', onActivity);
      window.removeEventListener('keydown', onActivity);
    };
  }, [resetTimer, cancelFade]);

  return { fadeOpacityRef, resetInactivity: resetTimer };
}
