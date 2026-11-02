import React from 'react';
import { BookOpen, MessageCircle, Monitor } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { HoveredStudyItem } from '../types';

interface StudyHoverTooltipProps {
  item: HoveredStudyItem | null;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}

export function StudyHoverTooltip({ item, anchorRef }: StudyHoverTooltipProps) {
  return (
    <div
      ref={anchorRef}
      aria-live="polite"
      className="fixed top-0 left-0 z-35 pointer-events-none select-none will-change-transform"
      style={{
        transform: item
          ? `translate3d(${item.initialX}px, ${item.initialY}px, 0)`
          : 'translate3d(-9999px, -9999px, 0)',
      }}
    >
      <div className="-translate-x-1/2 -translate-y-[calc(100%+14px)]">
        <AnimatePresence mode="wait">
          {item && (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.92, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card-surface relative w-[248px] rounded-2xl px-3.5 py-3 space-y-1.5"
            >
              {/* Top subtle accent hairline */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-4 top-0 h-[1.5px] rounded-full"
                style={{
                  background: `linear-gradient(90deg, transparent, ${item.accentColor}, transparent)`,
                }}
              />

              {/* Category header */}
              <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                {item.kind === 'book' ? (
                  <BookOpen
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: item.accentColor }}
                  />
                ) : item.kind === 'scholar' ? (
                  <MessageCircle
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: item.accentColor }}
                  />
                ) : (
                  <Monitor
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: 'var(--accent-primary)' }}
                  />
                )}
                <span
                  className="truncate"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {item.category}
                </span>
              </div>

              {/* Primary title */}
              <div
                className="font-display text-sm font-semibold leading-snug"
                style={{ color: 'var(--text-primary)' }}
              >
                {item.title}
              </div>

              {/* Author / System subtitle */}
              <div
                className="text-xs font-medium leading-snug"
                style={{ color: 'var(--text-secondary)' }}
              >
                {item.subtitle}
              </div>

              {/* Detail & click hint */}
              <div
                className="pt-1 border-t text-[11px] leading-snug"
                style={{
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                {item.detail}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
