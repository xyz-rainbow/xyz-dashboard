/**
 *  __   __  ________
 *  \ \ / / |___  __/
 *   \ V /      / /   
 *    > <      / /    
 *   / ^ \    / /___  
 *  /_/ \_\  /______/ 
 * 
 * Cuadrícula Principal (Grid) - XYZ Dashboard
 * #xyz-rainbow #xyz-rainbowtechnology #rainbowtechnology.xyz
 */

import { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import GridButton from './GridButton';

export default function MacroGrid() {
  const { gridSize, pageGridSizes, buttons, currentPage, nextPage, prevPage, setError } =
    useStore();
  const totalPages = Math.max(1, pageGridSizes.length);
  const clampedPage = Math.min(currentPage, totalPages - 1);
  // Dimensions and slice length must match this page’s entry in pageGridSizes (not legacy gridSize alone).
  const [rows, cols] = pageGridSizes[clampedPage] ?? gridSize;
  const pageSize = rows * cols;

  const start = pageGridSizes
    .slice(0, clampedPage)
    .reduce((acc, [r, c]) => acc + r * c, 0);
  const pageButtons = buttons.slice(start, start + pageSize);

  // Navegación mediante la rueda del ratón
  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (event.deltaY > 0) nextPage();
      else if (event.deltaY < 0) prevPage();
    },
    [nextPage, prevPage]
  );

  useEffect(() => {
    // Navegación mediante flechas del teclado
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        nextPage();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        prevPage();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [nextPage, prevPage]);

  return (
    <motion.div
      className="p-4"
      layout
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onWheel={handleWheel}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={clampedPage}
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
          initial={{ opacity: 0, x: 22, scale: 0.985 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -22, scale: 0.985 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
        >
          {pageButtons.map((button) => (
            <motion.div
              key={button.id}
              layout
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <GridButton button={button} onHover={() => setError(null)} />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
