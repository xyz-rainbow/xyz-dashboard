import { motion } from 'framer-motion';
import { useStore } from '../store';
import { useDragSnap } from '../hooks/useDragSnap';
import settingsSvg from '../assets/icons/settings.svg';
import { playDragSfx, playTapSfx } from '../audio/sfx';

export default function SettingsIcon() {
  const { setSettingsOpen, setError } = useStore();
  const { getCornerPosition, snapToNearestCorner } = useDragSnap();

  const handleTap = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    _info: { point: { x: number; y: number } }
  ) => {
    void playTapSfx().catch(() => undefined);
    setSettingsOpen(true);
  };

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: { point: { x: number; y: number } }
  ) => {
    void playDragSfx().catch(() => undefined);
    const w = window.innerWidth;
    const h = window.innerHeight;
    snapToNearestCorner(info.point.x, info.point.y, w, h);
  };

  const pos = getCornerPosition(window.innerWidth, window.innerHeight);

  return (
    <motion.div
      className="absolute z-50 cursor-pointer"
      data-no-drag
      style={{ top: 0, left: 0 }}
      animate={{ x: pos.x, y: pos.y }}
      initial={false}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      drag
      dragMomentum={false}
      dragElastic={0.1}
      onDragEnd={handleDragEnd}
      onTap={handleTap}
      whileHover={{ opacity: 1 }}
      onMouseEnter={() => setError(null)}
    >
      <motion.img
        src={settingsSvg}
        alt="Settings"
        className="w-6 h-6"
        style={{ opacity: 0.25 }}
        whileHover={{ opacity: 0.8, rotate: 45 }}
        transition={{ duration: 0.2 }}
        draggable={false}
      />
    </motion.div>
  );
}
