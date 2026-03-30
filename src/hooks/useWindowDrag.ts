import { useEffect, useCallback, useRef } from 'react';
import { getCurrentWindow, LogicalPosition } from '@tauri-apps/api/window';

export function useWindowDrag(ref: React.RefObject<HTMLElement | null>) {
  const dragging = useRef(false);
  const winPos = useRef({ x: 0, y: 0 });
  const mouseStart = useRef({ x: 0, y: 0 });
  const scale = useRef(1);
  const latestMouse = useRef({ x: 0, y: 0 });
  const rafId = useRef<number | null>(null);

  const onMouseDown = useCallback(async (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      e.button !== 0 ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('select') ||
      target.closest('[data-no-drag]')
    ) {
      return;
    }

    const appWindow = getCurrentWindow();
    const pos = await appWindow.outerPosition();
    const sf = await appWindow.scaleFactor();
    winPos.current = pos;
    mouseStart.current = { x: e.clientX, y: e.clientY };
    latestMouse.current = { x: e.clientX, y: e.clientY };
    scale.current = sf;
    dragging.current = true;
    e.preventDefault();
  }, []);

  const applyDragPosition = useCallback(() => {
    if (!dragging.current) {
      rafId.current = null;
      return;
    }
    const appWindow = getCurrentWindow();
    const sf = scale.current;
    const dx = (latestMouse.current.x - mouseStart.current.x) * sf;
    const dy = (latestMouse.current.y - mouseStart.current.y) * sf;
    void appWindow.setPosition(
      new LogicalPosition(winPos.current.x + dx, winPos.current.y + dy)
    );
    rafId.current = requestAnimationFrame(applyDragPosition);
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return;
    latestMouse.current = { x: e.clientX, y: e.clientY };
    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(applyDragPosition);
    }
  }, [applyDragPosition]);

  const onMouseUp = useCallback(() => {
    dragging.current = false;
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [ref, onMouseDown, onMouseMove, onMouseUp]);
}
