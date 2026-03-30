import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { playErrorSfx } from '../audio/sfx';

export default function ErrorOverlay() {
  const error = useStore((s) => s.error);
  const setError = useStore((s) => s.setError);

  useEffect(() => {
    if (error) {
      void playErrorSfx().catch((playError) => {
        console.warn('Failed to play synthesized error sound:', playError);
      });
    }
  }, [error]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(t);
    }
  }, [error, setError]);

  return (
    <>
      <AnimatePresence>
        {error && (
          <motion.div className="absolute inset-0 rounded-[20px] z-40 pointer-events-none">
            <motion.div
              className="absolute inset-0 rounded-[20px]"
              initial={{ opacity: 0, backgroundColor: 'rgba(220,38,38,0)' }}
              animate={{
                opacity: [0, 0.9, 0.7, 0.55, 0.35, 0.18, 0],
                backgroundColor: [
                  'rgba(220,38,38,0)',
                  'rgba(220,38,38,0.92)',
                  'rgba(185,28,28,0.75)',
                  'rgba(120,14,14,0.42)',
                  'rgba(0,0,0,0)',
                ],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute inset-0 rounded-[20px] border border-red-500/60"
              initial={{ x: 0, y: 0, scale: 1, opacity: 0 }}
              animate={{
                opacity: [0, 1, 1, 1, 0],
                x: [0, -5, 5, -4, 4, -3, 3, 0],
                y: [0, -2, 2, -1, 1, 0],
                scale: [1, 1.012, 1, 1.012, 1, 1.012, 1],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.95, ease: 'easeInOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
