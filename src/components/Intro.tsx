import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { LOGO_FULL } from '../lib/brand';

export default function Intro({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShow(false), reduce ? 400 : 2300); return () => clearTimeout(t); }, [reduce]);
  return (
    <AnimatePresence onExitComplete={onDone}>
      {show && (
        <motion.div key="intro" className="fixed inset-0 z-[100] grid place-items-center bg-background sky-glow" exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
          <motion.img src={LOGO_FULL} alt="MistEra SMP" className="w-[min(80vw,460px)] h-auto object-contain"
            initial={reduce ? false : { opacity: 0, scale: 0.6, y: 30, rotate: -4 }} animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, scale: 1.15, y: -30, filter: 'blur(8px)' }} transition={{ type: 'spring', stiffness: 120, damping: 14 }} />
          <motion.div className="absolute bottom-16 h-1 w-40 overflow-hidden rounded-full bg-secondary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1.8, ease: 'easeInOut' }} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
