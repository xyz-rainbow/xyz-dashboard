import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { playSuccessSfx } from '../audio/sfx';

export default function GridControls() {
  const { gridSize, pageGridSizes, currentPage, cycleGridSize, prevPage, nextPage, setError } =
    useStore();
  const [rows, cols] = gridSize;
  const totalPages = Math.max(1, pageGridSizes.length);
  const page = Math.min(currentPage + 1, totalPages);
  const previousPagesRef = useRef(totalPages);

  useEffect(() => {
    if (totalPages > previousPagesRef.current) {
      void playSuccessSfx().catch((error) => {
        console.warn('Success SFX failed:', error);
      });
    }
    previousPagesRef.current = totalPages;
  }, [totalPages]);

  return (
    <motion.div
      className="flex items-center gap-2 justify-center py-2"
      layout
    >
      <button
        className="glass-button w-7 h-7 flex items-center justify-center text-white/40 hover:text-white/80 text-sm cursor-pointer"
        onClick={() => cycleGridSize(-1)}
        onMouseEnter={() => setError(null)}
      >
        -
      </button>

      <motion.span
        className="text-[11px] text-white/40 font-mono min-w-[2rem] text-center"
        key={`${rows}x${cols}`}
        initial={{ y: -4, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        {cols}x{rows}
      </motion.span>

      <button
        className="glass-button w-7 h-7 flex items-center justify-center text-white/40 hover:text-white/80 text-sm cursor-pointer"
        onClick={() => cycleGridSize(1)}
        onMouseEnter={() => setError(null)}
      >
        +
      </button>

      <button
        className="glass-button w-7 h-7 flex items-center justify-center text-white/40 hover:text-white/80 text-sm cursor-pointer"
        onClick={prevPage}
        onMouseEnter={() => setError(null)}
        title="Previous page (Arrow Left)"
      >
        ‹
      </button>
      <motion.span
        key={`${page}-${totalPages}`}
        initial={{ scale: 0.92, opacity: 0.75 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 520, damping: 24 }}
        className="text-[10px] text-white/40 font-mono min-w-[3.2rem] text-center"
      >
        {page}/{totalPages}
      </motion.span>
      <button
        className="glass-button w-7 h-7 flex items-center justify-center text-white/40 hover:text-white/80 text-sm cursor-pointer"
        onClick={nextPage}
        onMouseEnter={() => setError(null)}
        title="Next page (Arrow Right)"
      >
        ›
      </button>
    </motion.div>
  );
}
