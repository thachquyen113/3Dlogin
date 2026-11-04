import React, { useState } from 'react';
import { motion } from 'motion/react';

interface ScholarTalkLabelProps {
  active: boolean;
  highlighted: boolean;
  isConversing: boolean;
  isScholarSpeaking: boolean;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  onOpenChat: () => void;
  onLabelEngageChange: (engaged: boolean) => void;
}

/**
 * Floating 3D-projected Talking Icon Label anchored above the person reading
 * the book on the sofa. Appears smoothly on hover, pointer move, camera focus,
 * or keyboard focus, and opens the scholar conversation modal when clicked.
 */
export function ScholarTalkLabel({
  active,
  highlighted,
  isConversing,
  isScholarSpeaking,
  anchorRef,
  onOpenChat,
  onLabelEngageChange,
}: ScholarTalkLabelProps) {
  const [selfHovered, setSelfHovered] = useState(false);
  const [selfFocused, setSelfFocused] = useState(false);

  const isVisible = active || selfHovered || selfFocused;
  const isEmphasized = highlighted || selfHovered || selfFocused || isScholarSpeaking;

  const headline = isScholarSpeaking
    ? 'Prof. Linnea · Speaking'
    : isConversing
      ? 'Prof. Linnea · Listening'
      : 'Talk · Prof. Linnea';

  const sublabel = isScholarSpeaking
    ? 'Answering your question'
    : isConversing
      ? 'Ask another question'
      : 'Click to ask a question';

  return (
    <div
      ref={anchorRef}
      className="fixed top-0 left-0 z-34 pointer-events-none select-none will-change-transform"
      style={{
        transform: 'translate3d(-9999px, -9999px, 0)',
      }}
    >
      <div className="-translate-x-1/2 -translate-y-[calc(100%+14px)]">
        <motion.button
          type="button"
          aria-label="Talk with Professor Arthur Linnea, reading on the sofa"
          initial={false}
          animate={
            isVisible
              ? { opacity: 1, scale: isEmphasized ? 1.03 : 1, y: 0 }
              : { opacity: 0, scale: 0.9, y: 8 }
          }
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => {
            e.stopPropagation();
            onOpenChat();
          }}
          onMouseEnter={() => {
            setSelfHovered(true);
            onLabelEngageChange(true);
          }}
          onMouseLeave={() => {
            setSelfHovered(false);
            onLabelEngageChange(false);
          }}
          onFocus={() => {
            setSelfFocused(true);
            onLabelEngageChange(true);
          }}
          onBlur={() => {
            setSelfFocused(false);
            onLabelEngageChange(false);
          }}
          className={`glass-card-surface relative rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
            isVisible ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
        >
          {/* Top specular accent hairline */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 top-0 h-[1.5px] rounded-full"
            style={{
              background:
                'linear-gradient(90deg, transparent, var(--accent-celestial), transparent)',
            }}
          />

          {/* Talking Speech-Bubble + Voice Bars Icon Badge */}
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200"
            style={{
              backgroundColor: isEmphasized
                ? 'var(--accent-primary)'
                : 'var(--bg-glass-subtle)',
              color: isEmphasized
                ? 'var(--text-on-accent)'
                : 'var(--accent-primary)',
              border: isEmphasized
                ? '1px solid transparent'
                : '1px solid var(--border-subtle)',
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-4 h-4"
              aria-hidden="true"
            >
              {/* Speech Bubble Outline */}
              <path
                d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* 3 Internal Talking Voice Bars */}
              <motion.line
                x1="9"
                y1="10"
                x2="9"
                y2="13"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                animate={
                  isScholarSpeaking
                    ? { y1: [10.5, 8.8, 10.5], y2: [12.5, 14.2, 12.5] }
                    : { y1: 10, y2: 13 }
                }
                transition={
                  isScholarSpeaking
                    ? { duration: 0.55, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.2 }
                }
              />
              <motion.line
                x1="12"
                y1="8.5"
                x2="12"
                y2="14.5"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                animate={
                  isScholarSpeaking
                    ? { y1: [9.5, 7.6, 9.5], y2: [13.5, 15.4, 13.5] }
                    : { y1: 8.5, y2: 14.5 }
                }
                transition={
                  isScholarSpeaking
                    ? {
                        duration: 0.48,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: 0.12,
                      }
                    : { duration: 0.2 }
                }
              />
              <motion.line
                x1="15"
                y1="10"
                x2="15"
                y2="13"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                animate={
                  isScholarSpeaking
                    ? { y1: [10.5, 9, 10.5], y2: [12.5, 14, 12.5] }
                    : { y1: 10, y2: 13 }
                }
                transition={
                  isScholarSpeaking
                    ? {
                        duration: 0.52,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: 0.22,
                      }
                    : { duration: 0.2 }
                }
              />
            </svg>
          </div>

          {/* Crisp Talking Label Copy */}
          <div className="pr-0.5">
            <div
              className="font-display text-xs font-semibold leading-tight whitespace-nowrap"
              style={{ color: 'var(--text-primary)' }}
            >
              {headline}
            </div>
            <div
              className="text-[11px] font-medium leading-tight mt-0.5 whitespace-nowrap"
              style={{ color: 'var(--text-secondary)' }}
            >
              {sublabel}
            </div>
          </div>

          {/* Speech-bubble pointer tip aimed down at the reading scholar */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
            style={{
              backgroundColor: 'var(--bg-glass-card)',
              borderRight: '1px solid var(--border-glass)',
              borderBottom: '1px solid var(--border-glass)',
            }}
          />
        </motion.button>
      </div>
    </div>
  );
}
