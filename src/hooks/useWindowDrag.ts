import { useEffect, useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { playDragSfx } from '../audio/sfx';

export function useWindowDrag(ref: React.RefObject<HTMLElement | null>) {
  const onMouseDown = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const isDragHandle = !!target.closest('[data-drag-window]');
    if (
      e.button !== 0 ||
      (!isDragHandle &&
        (target.closest('button') ||
          target.closest('input') ||
          target.closest('textarea') ||
          target.closest('select') ||
          target.closest('[data-no-drag]')))
    ) {
      return;
    }

    void playDragSfx().catch(() => undefined);
    void getCurrentWindow().startDragging().catch((error) => {
      console.warn('Window drag failed:', error);
    });
    e.preventDefault();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.addEventListener('mousedown', onMouseDown);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
    };
  }, [ref, onMouseDown]);
}
