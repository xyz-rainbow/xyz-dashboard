import { motion } from 'framer-motion';
import { useStore } from '../store';
import { useDragSnap } from '../hooks/useDragSnap';
import settingsSvg from '../assets/icons/settings.svg';

export default function SettingsIcon() {
  const { setSettingsOpen, setError } = useStore();
  const { getCornerPosition, snapToNearestCorner } = useDragSnap();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSettingsOpen(true);
  };

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: { point: { x: number; y: number } }
  ) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    snapToNearestCorner(info.point.x, info.point.y, w, h);
  };

  const pos = getCornerPosition(window.innerWidth, window.innerHeight);
  const absPos = getAbsolutePosition(pos);

  return (
    <motion.div
      className="absolute z-50 cursor-pointer"
      style={absPos}
      animate={absPos}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      drag
      dragMomentum={false}
      dragElastic={0.1}
      onDragEnd={handleDragEnd}
      whileHover={{ opacity: 1 }}
      onMouseEnter={() => setError(null)}
      onClick={handleClick}
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

function getAbsolutePosition(pos: { x: number; y: number }) {
  const isRight = pos.x > window.innerWidth / 2;
  const isBottom = pos.y > window.innerHeight / 2;

  return {
    top: isBottom ? 'auto' : `${pos.y}px`,
    bottom: isBottom ? `${window.innerHeight - pos.y - 24}px` : 'auto',
    left: isRight ? 'auto' : `${pos.x}px`,
    right: isRight ? `${window.innerWidth - pos.x - 24}px` : 'auto',
  };
}
