import { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'motion/react';
import type { ThemeMode } from '../types';

interface BotanicalCursorProps {
  theme: ThemeMode;
  externalInteractive?: boolean;
}

type MoteKind = 'petal' | 'leaf' | 'dew';

interface TrailMote {
  id: number;
  x: number;
  y: number;
  driftX: number;
  driftY: number;
  rotation: number;
  spin: number;
  size: number;
  color: string;
  kind: MoteKind;
}

const LIGHT_PALETTE = ['#10b981', '#f59e0b', '#f472b6', '#34d399', '#fbbf24'];
const DARK_PALETTE = ['#5eead4', '#93c5fd', '#fde68a', '#a5f3fc', '#c4b5fd'];
const MOTE_KINDS: MoteKind[] = ['dew', 'petal', 'dew', 'leaf'];

const MAX_TRAIL_MOTES = 18;
const MIN_SPAWN_DIST_PX = 16;
const MIN_SPAWN_INTERVAL_MS = 36;
const MOTE_LIFETIME_MS = 820;

export function BotanicalCursor({
  theme,
  externalInteractive = false,
}: BotanicalCursorProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isFinePointer, setIsFinePointer] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [motes, setMotes] = useState<TrailMote[]>([]);

  // Raw pointer motion values
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Crisp inner botanical dewdrop spring
  const dotX = useSpring(mouseX, { stiffness: 720, damping: 38, mass: 0.2 });
  const dotY = useSpring(mouseY, { stiffness: 720, damping: 38, mass: 0.2 });

  // Smooth lagging botanical halo ring spring
  const ringX = useSpring(mouseX, { stiffness: 230, damping: 26, mass: 0.55 });
  const ringY = useSpring(mouseY, { stiffness: 230, damping: 26, mass: 0.55 });

  // Mutable refs for zero-overhead throttling inside pointermove
  const themeRef = useRef<ThemeMode>(theme);
  themeRef.current = theme;

  const lastSpawnPos = useRef({ x: -999, y: -999 });
  const lastSpawnTime = useRef(0);
  const nextId = useRef(1);
  const cleanupTimers = useRef<number[]>([]);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)');
    const updatePointer = () => setIsFinePointer(mq.matches);
    updatePointer();
    mq.addEventListener('change', updatePointer);
    return () => mq.removeEventListener('change', updatePointer);
  }, []);

  useEffect(() => {
    if (!isFinePointer) return;

    const handlePointerMove = (e: PointerEvent) => {
      const { clientX, clientY } = e;
      mouseX.set(clientX);
      mouseY.set(clientY);

      if (!visible) {
        setVisible(true);
      }

      // Check if hovering an interactive control for organic ring bloom
      const target = e.target as HTMLElement | null;
      const interactive = Boolean(
        target?.closest('button, a, input, label, select, textarea, [role="button"]'),
      );
      setIsHoveringInteractive(interactive);

      if (prefersReducedMotion) return;

      const now = performance.now();
      const dx = clientX - lastSpawnPos.current.x;
      const dy = clientY - lastSpawnPos.current.y;
      const dist = Math.hypot(dx, dy);

      if (
        dist >= MIN_SPAWN_DIST_PX &&
        now - lastSpawnTime.current >= MIN_SPAWN_INTERVAL_MS
      ) {
        lastSpawnPos.current = { x: clientX, y: clientY };
        lastSpawnTime.current = now;

        const id = nextId.current++;
        const palette =
          themeRef.current === 'light' ? LIGHT_PALETTE : DARK_PALETTE;
        const color = palette[id % palette.length];
        const kind = MOTE_KINDS[id % MOTE_KINDS.length];

        // Gentle organic drift perpendicular & slightly upward/downward like floating pollen/dew
        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.6;
        const driftMag = 14 + Math.random() * 18;
        const driftX = -Math.cos(angle) * driftMag * 0.45 + (Math.random() - 0.5) * 14;
        const driftY =
          -Math.sin(angle) * driftMag * 0.45 +
          (themeRef.current === 'light' ? -10 : -14) +
          (Math.random() - 0.5) * 10;

        const newMote: TrailMote = {
          id,
          x: clientX,
          y: clientY,
          driftX,
          driftY,
          rotation: Math.random() * 360,
          spin: (Math.random() - 0.5) * 110,
          size: kind === 'dew' ? 5 + (id % 3) * 1.5 : 8 + (id % 3) * 2,
          color,
          kind,
        };

        setMotes((prev) => {
          const trimmed =
            prev.length >= MAX_TRAIL_MOTES
              ? prev.slice(prev.length - MAX_TRAIL_MOTES + 1)
              : prev;
          return [...trimmed, newMote];
        });

        const timerId = window.setTimeout(() => {
          setMotes((prev) => prev.filter((m) => m.id !== id));
        }, MOTE_LIFETIME_MS);
        cleanupTimers.current.push(timerId);
      }
    };

    const handlePointerDown = () => setIsPressed(true);
    const handlePointerUp = () => setIsPressed(false);
    const handlePointerLeaveWindow = () => setVisible(false);

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeaveWindow);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('mouseleave', handlePointerLeaveWindow);
      cleanupTimers.current.forEach((id) => window.clearTimeout(id));
      cleanupTimers.current = [];
    };
  }, [isFinePointer, mouseX, mouseY, prefersReducedMotion, visible]);

  if (!isFinePointer) return null;

  const activeInteractive = isHoveringInteractive || externalInteractive;
  const ringScale = isPressed ? 0.82 : activeInteractive ? 1.38 : 1;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden select-none"
    >
      {/* Subtle Botanical Particle Wake (Compositor-Only Transform & Opacity) */}
      <AnimatePresence>
        {motes.map((mote) => (
          <motion.div
            key={mote.id}
            initial={{
              x: mote.x - mote.size / 2,
              y: mote.y - mote.size / 2,
              scale: 0.35,
              opacity: 0.82,
              rotate: mote.rotation,
            }}
            animate={{
              x: mote.x - mote.size / 2 + mote.driftX,
              y: mote.y - mote.size / 2 + mote.driftY,
              scale: [0.35, 1, 0.15],
              opacity: [0.82, 0.65, 0],
              rotate: mote.rotation + mote.spin,
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
              duration: MOTE_LIFETIME_MS / 1000,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: mote.size,
              height: mote.size,
              willChange: 'transform, opacity',
            }}
          >
            {mote.kind === 'petal' ? (
              <svg
                viewBox="0 0 16 16"
                className="w-full h-full overflow-visible"
                style={{
                  filter:
                    theme === 'dark'
                      ? `drop-shadow(0 0 4px ${mote.color})`
                      : 'none',
                }}
              >
                <path
                  d="M8 1C11.5 4.2 12.8 8.8 8 15C3.2 8.8 4.5 4.2 8 1Z"
                  fill={mote.color}
                  fillOpacity={0.85}
                />
              </svg>
            ) : mote.kind === 'leaf' ? (
              <svg
                viewBox="0 0 16 16"
                className="w-full h-full overflow-visible"
                style={{
                  filter:
                    theme === 'dark'
                      ? `drop-shadow(0 0 4px ${mote.color})`
                      : 'none',
                }}
              >
                <path
                  d="M14 2C8.5 2.2 3.5 5.8 2 14C10.2 12.5 13.8 7.5 14 2Z"
                  fill={mote.color}
                  fillOpacity={0.82}
                />
              </svg>
            ) : (
              <div
                className="w-full h-full rounded-full"
                style={{
                  backgroundColor: mote.color,
                  boxShadow:
                    theme === 'dark'
                      ? `0 0 8px 1px ${mote.color}`
                      : `0 0 5px 0 ${mote.color}`,
                }}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Smooth Spring Botanical Follower Aura Ring */}
      <motion.div
        style={{
          position: 'fixed',
          top: -15,
          left: -15,
          width: 30,
          height: 30,
          x: ringX,
          y: ringY,
          willChange: 'transform, opacity',
          borderColor: 'var(--accent-primary)',
          backgroundColor: 'var(--accent-glow)',
        }}
        animate={{
          opacity: visible ? (activeInteractive ? 0.72 : 0.48) : 0,
          scale: ringScale,
        }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-full border transition-colors duration-500"
      />

      {/* Crisp Inner Botanical Dewdrop Seed */}
      <motion.div
        style={{
          position: 'fixed',
          top: -3,
          left: -3,
          width: 6,
          height: 6,
          x: dotX,
          y: dotY,
          willChange: 'transform, opacity',
          backgroundColor: 'var(--accent-celestial)',
          boxShadow: '0 0 8px var(--accent-glow)',
        }}
        animate={{
          opacity: visible ? 0.9 : 0,
          scale: isPressed ? 0.65 : activeInteractive ? 1.2 : 1,
        }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-full transition-colors duration-500"
      />
    </div>
  );
}
