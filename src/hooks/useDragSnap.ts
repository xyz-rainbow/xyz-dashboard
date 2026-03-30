import { useCallback } from 'react';
import type { Corner } from '../types';
import { useStore } from '../store';

const PADDING = 12;
const ICON_SIZE = 40;

const CORNER_POSITIONS: Record<Corner, { x: number; y: number }> = {
  tl: { x: PADDING, y: PADDING },
  tr: { x: -PADDING - ICON_SIZE, y: PADDING },
  bl: { x: PADDING, y: -PADDING - ICON_SIZE },
  br: { x: -PADDING - ICON_SIZE, y: -PADDING - ICON_SIZE },
};

export function useDragSnap() {
  const corner = useStore((s) => s.settingsIconCorner);
  const setCorner = useStore((s) => s.setSettingsIconCorner);

  const getCornerPosition = useCallback(
    (windowWidth: number, windowHeight: number) => {
      const pos = CORNER_POSITIONS[corner];
      // Convert to absolute position
      return {
        x: pos.x < 0 ? windowWidth + pos.x : pos.x,
        y: pos.y < 0 ? windowHeight + pos.y : pos.y,
      };
    },
    [corner]
  );

  const snapToNearestCorner = useCallback(
    (x: number, y: number, windowWidth: number, windowHeight: number) => {
      const corners: { corner: Corner; cx: number; cy: number }[] = [
        { corner: 'tl', cx: PADDING, cy: PADDING },
        { corner: 'tr', cx: windowWidth - PADDING - ICON_SIZE, cy: PADDING },
        { corner: 'bl', cx: PADDING, cy: windowHeight - PADDING - ICON_SIZE },
        {
          corner: 'br',
          cx: windowWidth - PADDING - ICON_SIZE,
          cy: windowHeight - PADDING - ICON_SIZE,
        },
      ];

      let minDist = Infinity;
      let closest: Corner = 'br';

      for (const c of corners) {
        const dist = Math.hypot(x - c.cx, y - c.cy);
        if (dist < minDist) {
          minDist = dist;
          closest = c.corner;
        }
      }

      setCorner(closest);
      return CORNER_POSITIONS[closest];
    },
    [setCorner]
  );

  return { getCornerPosition, snapToNearestCorner, corner };
}
