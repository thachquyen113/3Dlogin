import React, { useMemo, useState } from 'react';
import { Heart, PhoneCall, RotateCcw, X } from 'lucide-react';
import { motion, type Variants } from 'motion/react';
import type { ThemeMode } from '../types';

interface ScholarError3DAlertProps {
  error: string;
  failedQuestion?: string | null;
  onRetry: () => void;
  onEdit?: () => void;
  onDismiss: () => void;
  onOpenSupportHandover?: (topic?: string) => void;
  isFullScreen?: boolean;
  theme: ThemeMode;
}

interface FailureCategorization {
  type: 'timeout' | 'quota' | 'key' | 'connection' | 'general';
  headline: string;
  reason: string;
  catMood: string;
}

function categorizeFailure(rawError: string): FailureCategorization {
  const err = rawError.toLowerCase();

  if (err.includes('quota') || err.includes('429') || err.includes('resource_exhausted')) {
    return {
      type: 'quota',
      headline: 'Study Tea Break',
      reason: 'Professor Linnea is taking a brief sip of warm chamomile tea beside sleeping Barnaby.',
      catMood: 'Zzz...',
    };
  }

  if (
    err.includes('api_key') ||
    err.includes('missing_gemini_api_key') ||
    err.includes('permission_denied') ||
    err.includes('403') ||
    err.includes('settings > secrets')
  ) {
    return {
      type: 'key',
      headline: 'Archival Key Required',
      reason: 'An archival Gemini API key is needed in Settings Secrets to consult rare manuscripts.',
      catMood: '🗝️ Key',
    };
  }

  if (
    err.includes('failed to fetch') ||
    err.includes('network') ||
    err.includes('connection') ||
    err.includes('eaddrinuse') ||
    err.includes('502') ||
    err.includes('503') ||
    err.includes('504')
  ) {
    return {
      type: 'connection',
      headline: 'Conservatory Line Rustled',
      reason: 'A sudden garden breeze through the glasshouse flickered the library communication line.',
      catMood: '🍃 Breeze',
    };
  }

  if (err.includes('hear that clearly') || err.includes('could not reply') || err.includes('paused')) {
    return {
      type: 'timeout',
      headline: 'Deep in Thought',
      reason: 'Professor Linnea is still pondering your question and drifted into deep reflection.',
      catMood: '💭 Hmm',
    };
  }

  return {
    type: 'general',
    headline: 'Scholar Interrupted',
    reason: 'Barnaby the tabby cat gently nudged Arthur’s folio, interrupting his train of thought.',
    catMood: '🐾 Meow',
  };
}

const alertCardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 16,
    scale: 0.94,
    rotateX: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: {
      type: 'spring',
      stiffness: 340,
      damping: 24,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.96,
    rotateX: -10,
    transition: {
      duration: 0.16,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

/**
 * Centered Animated Barnaby Cat Mascot Component
 */
interface CatAnimationProps {
  failureType: FailureCategorization['type'];
  catMood: string;
  isRetrying: boolean;
  theme: ThemeMode;
}

function CenteredBarnabyCat({
  failureType,
  catMood,
  isRetrying,
  theme,
}: CatAnimationProps) {
  const [purrCount, setPurrCount] = useState(0);
  const isDark = theme === 'dark';

  return (
    <div
      onClick={() => setPurrCount((c) => c + 1)}
      title="Barnaby the Study Cat (Click to pet)"
      className="relative flex flex-col items-center justify-center cursor-pointer select-none group"
    >
      {/* Soft Luminous Aura */}
      <div
        className="absolute -inset-1 rounded-full blur-xl pointer-events-none opacity-45 transition-opacity group-hover:opacity-80"
        style={{
          background: isDark
            ? 'radial-gradient(circle, rgba(251, 146, 60, 0.45) 0%, rgba(244, 63, 94, 0.15) 60%, transparent 80%)'
            : 'radial-gradient(circle, rgba(251, 146, 60, 0.35) 0%, rgba(253, 186, 116, 0.2) 60%, transparent 80%)',
        }}
      />

      {/* Floating Cat Mood Tag */}
      <motion.div
        animate={{
          y: [-2, 2, -2],
          scale: [0.96, 1.04, 0.96],
        }}
        transition={{
          duration: 2.6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -top-2 right-1 sm:-right-2 z-20 px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 shadow-xs border backdrop-blur-md"
        style={{
          backgroundColor: isDark ? 'rgba(30, 20, 28, 0.92)' : 'rgba(255, 255, 255, 0.96)',
          borderColor: isDark ? 'rgba(251, 146, 60, 0.4)' : 'rgba(249, 115, 22, 0.3)',
          color: isDark ? '#fdba74' : '#c2410c',
        }}
      >
        <span>{catMood}</span>
      </motion.div>

      {/* Interactive Purr Animation */}
      {purrCount > 0 && (
        <motion.div
          key={purrCount}
          initial={{ opacity: 0, y: 0, scale: 0.6 }}
          animate={{ opacity: [0, 1, 0], y: -24, scale: [0.6, 1.15, 0.85] }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
          className="absolute -top-4 left-3 z-30 pointer-events-none flex items-center gap-1 text-rose-500 font-bold text-[11px]"
        >
          <Heart className="w-3 h-3 fill-current" />
          <span>Purr!</span>
        </motion.div>
      )}

      {/* SVG Animated Barnaby */}
      <svg
        viewBox="0 0 140 115"
        className="w-22 h-18 sm:w-26 sm:h-20 filter drop-shadow-md transition-transform group-hover:scale-105"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="barnabyFurCompact" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="60%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>

          <linearGradient id="barnabyCreamCompact" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fff7ed" />
            <stop offset="100%" stopColor="#ffedd5" />
          </linearGradient>

          <linearGradient id="barnabyStripeCompact" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c2410c" />
            <stop offset="100%" stopColor="#9a3412" />
          </linearGradient>

          <linearGradient id="cushionGradCompact" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isDark ? '#4c1d30' : '#fecdd3'} />
            <stop offset="100%" stopColor={isDark ? '#230a17' : '#fb7185'} />
          </linearGradient>
        </defs>

        {/* 1. Velvet Cushion Base */}
        <g id="cushion-compact">
          <ellipse cx="70" cy="100" rx="52" ry="12" fill="url(#cushionGradCompact)" />
          <ellipse
            cx="70"
            cy="99"
            rx="48"
            ry="9"
            fill="none"
            stroke={isDark ? 'rgba(251, 113, 133, 0.35)' : 'rgba(255, 255, 255, 0.6)'}
            strokeWidth="1"
            strokeDasharray="3, 3"
          />
          <circle cx="20" cy="100" r="2" fill="#f59e0b" />
          <circle cx="120" cy="100" r="2" fill="#f59e0b" />
        </g>

        {/* 2. Swishing Tail */}
        <motion.path
          d="M 98 84 C 115 80, 128 68, 122 48 C 118 36, 108 36, 112 46 C 115 54, 108 64, 94 72"
          fill="url(#barnabyFurCompact)"
          stroke="#c2410c"
          strokeWidth="1"
          style={{ transformOrigin: '98px 84px' }}
          animate={{
            rotate: isRetrying ? [-28, 30, -28] : [-15, 18, -15],
          }}
          transition={{
            duration: isRetrying ? 0.8 : 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* 3. Cat Body with Gentle Breathing */}
        <motion.g
          animate={{
            scaleY: [1, 1.025, 1],
            y: [0, -1, 0],
          }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ transformOrigin: '70px 96px' }}
        >
          <ellipse cx="70" cy="76" rx="27" ry="20" fill="url(#barnabyFurCompact)" />
          <ellipse cx="70" cy="78" rx="14" ry="15" fill="url(#barnabyCreamCompact)" />
          <path
            d="M 47 72 Q 54 74 49 80 M 93 72 Q 86 74 91 80"
            stroke="url(#barnabyStripeCompact)"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
        </motion.g>

        {/* 4. Cat Head & Expressions */}
        <motion.g
          animate={{
            rotate: [-2, 2, -2],
            y: [-0.8, 0.8, -0.8],
          }}
          transition={{
            duration: 3.6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ transformOrigin: '70px 52px' }}
        >
          {/* Left Ear */}
          <motion.g
            animate={{
              rotate: isRetrying ? [-8, 8, -8] : [-4, 5, -4],
            }}
            transition={{
              duration: isRetrying ? 0.5 : 2.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ transformOrigin: '48px 40px' }}
          >
            <polygon points="43,44 54,22 62,38" fill="url(#barnabyFurCompact)" />
            <polygon points="46,41 54,27 59,37" fill="#fca5a5" />
          </motion.g>

          {/* Right Ear */}
          <motion.g
            animate={{
              rotate: isRetrying ? [8, -8, 8] : [5, -4, 5],
            }}
            transition={{
              duration: isRetrying ? 0.5 : 3,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.15,
            }}
            style={{ transformOrigin: '92px 40px' }}
          >
            <polygon points="97,44 86,22 78,38" fill="url(#barnabyFurCompact)" />
            <polygon points="94,41 86,27 81,37" fill="#fca5a5" />
          </motion.g>

          {/* Head Base */}
          <circle cx="70" cy="52" r="22" fill="url(#barnabyFurCompact)" />
          {/* M Stripes on Forehead */}
          <path
            d="M 63 36 L 66 43 L 70 39 L 74 43 L 77 36"
            stroke="url(#barnabyStripeCompact)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Cheeks */}
          <ellipse cx="65" cy="58" rx="6.5" ry="4.5" fill="url(#barnabyCreamCompact)" />
          <ellipse cx="75" cy="58" rx="6.5" ry="4.5" fill="url(#barnabyCreamCompact)" />

          {/* Eyes Blinking */}
          <motion.g
            animate={{
              scaleY: [1, 1, 0.1, 1, 1],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              times: [0, 0.88, 0.92, 0.96, 1],
            }}
            style={{ transformOrigin: '70px 50px' }}
          >
            {failureType === 'quota' ? (
              <>
                <path
                  d="M 58 50 Q 62 46 66 50"
                  stroke="#7c2d12"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M 74 50 Q 78 46 82 50"
                  stroke="#7c2d12"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                />
              </>
            ) : (
              <>
                <ellipse cx="61" cy="49" rx="3.8" ry="4.2" fill="#10b981" />
                <ellipse cx="61" cy="49" rx="1.8" ry="3.8" fill="#064e3b" />
                <circle cx="60" cy="47" r="1.1" fill="#ffffff" />

                <ellipse cx="79" cy="49" rx="3.8" ry="4.2" fill="#10b981" />
                <ellipse cx="79" cy="49" rx="1.8" ry="3.8" fill="#064e3b" />
                <circle cx="78" cy="47" r="1.1" fill="#ffffff" />
              </>
            )}
          </motion.g>

          {/* Wire Reading Glasses */}
          <g opacity="0.9">
            <circle cx="61" cy="49" r="6" fill="none" stroke="#f59e0b" strokeWidth="1.1" />
            <circle cx="79" cy="49" r="6" fill="none" stroke="#f59e0b" strokeWidth="1.1" />
            <path d="M 67 48 Q 70 46 73 48" stroke="#f59e0b" strokeWidth="1.1" fill="none" />
          </g>

          {/* Nose & Mouth */}
          <polygon points="68,54 72,54 70,57" fill="#f43f5e" />
          <path
            d="M 66 59 Q 70 61 70 57 Q 70 61 74 59"
            stroke="#7c2d12"
            strokeWidth="1.3"
            strokeLinecap="round"
            fill="none"
          />

          {/* Whiskers */}
          <motion.g
            animate={{
              rotate: [-2, 2, -2],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ transformOrigin: '70px 58px' }}
          >
            <line x1="57" y1="56" x2="44" y2="54" stroke="#fed7aa" strokeWidth="0.9" />
            <line x1="57" y1="58" x2="43" y2="60" stroke="#fed7aa" strokeWidth="0.9" />
            <line x1="83" y1="56" x2="96" y2="54" stroke="#fed7aa" strokeWidth="0.9" />
            <line x1="83" y1="58" x2="97" y2="60" stroke="#fed7aa" strokeWidth="0.9" />
          </motion.g>

          {/* Emerald Bowtie */}
          <g transform="translate(70, 68)">
            <polygon points="0,0 -7,-4 -7,4" fill="#059669" />
            <polygon points="0,0 7,-4 7,4" fill="#059669" />
            <circle cx="0" cy="0" r="2.6" fill="#f59e0b" />
          </g>
        </motion.g>

        {/* 5. Front Paws */}
        <g id="paws-compact">
          <ellipse cx="59" cy="91" rx="6" ry="4.5" fill="url(#barnabyCreamCompact)" />
          <ellipse cx="81" cy="91" rx="6" ry="4.5" fill="url(#barnabyCreamCompact)" />
        </g>
      </svg>
    </div>
  );
}

export function ScholarError3DAlert({
  error,
  failedQuestion: _failedQuestion,
  onRetry,
  onEdit: _onEdit,
  onDismiss,
  onOpenSupportHandover,
  theme,
}: ScholarError3DAlertProps) {
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isRetrying, setIsRetrying] = useState(false);

  const failure = useMemo(() => categorizeFailure(error), [error]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      x: -ny * 7,
      y: nx * 8,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const handleRetryClick = () => {
    setIsRetrying(true);
    onRetry();
  };

  const isDark = theme === 'dark';

  return (
    <div
      style={{ perspective: 1000 }}
      className="w-full my-2.5 max-w-sm sm:max-w-md mx-auto select-none"
    >
      <motion.div
        variants={alertCardVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transformStyle: 'preserve-3d',
          rotateX: tilt.x,
          rotateY: tilt.y,
          transition: 'transform 0.15s ease-out',
        }}
        role="alert"
        aria-live="assertive"
        className="relative rounded-2xl p-4 overflow-hidden border backdrop-blur-xl shadow-xl transition-colors duration-300"
        css-marker="scholar-3d-error-alert-compact"
      >
        {/* Subtle Ambient Background */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(38, 14, 24, 0.88) 0%, rgba(22, 12, 24, 0.94) 50%, rgba(12, 15, 28, 0.96) 100%)'
              : 'linear-gradient(135deg, rgba(255, 243, 243, 0.95) 0%, rgba(254, 247, 242, 0.92) 50%, rgba(255, 253, 250, 0.96) 100%)',
            borderColor: isDark ? 'rgba(251, 113, 133, 0.3)' : 'rgba(239, 68, 68, 0.22)',
          }}
        />

        {/* Specular Top Rim */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[1.5px] pointer-events-none"
          style={{
            background: isDark
              ? 'linear-gradient(90deg, transparent 0%, rgba(253, 164, 175, 0.75) 30%, rgba(251, 146, 60, 0.65) 70%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, rgba(239, 68, 68, 0.5) 30%, rgba(245, 158, 11, 0.45) 70%, transparent 100%)',
          }}
        />

        {/* Dismiss Button in Top Right */}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss alert"
          title="Dismiss"
          className="absolute top-2.5 right-2.5 z-20 p-1 rounded-lg transition-all hover:opacity-100 opacity-55 cursor-pointer border"
          style={{
            color: isDark ? '#fda4af' : '#9f1239',
            borderColor: isDark ? 'rgba(251, 113, 133, 0.2)' : 'rgba(244, 63, 94, 0.2)',
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.5)',
          }}
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Content Container (Centered Layout) */}
        <div
          className="relative z-10 flex flex-col items-center text-center"
          style={{ transform: 'translateZ(14px)' }}
        >
          {/* 1. Centered Barnaby the Study Cat Animation */}
          <div className="pt-0.5 pb-1">
            <CenteredBarnabyCat
              failureType={failure.type}
              catMood={failure.catMood}
              isRetrying={isRetrying}
              theme={theme}
            />
          </div>

          {/* Headline */}
          <h4
            className="font-display text-sm sm:text-base font-semibold tracking-tight mt-1"
            style={{
              color: isDark ? '#ffe4e6' : '#881337',
            }}
          >
            {failure.headline}
          </h4>

          {/* 2. Simple single sentence for reason text content */}
          <p
            className="text-xs sm:text-[13px] leading-relaxed mt-1 mb-3 px-2 max-w-xs sm:max-w-sm"
            style={{
              color: isDark ? '#fecdd3' : '#9f1239',
              opacity: 0.92,
            }}
          >
            {failure.reason}
          </p>

          {/* 3. Two Buttons: Retry and Support with text & icon */}
          <div
            className="w-full pt-2.5 border-t flex items-center justify-center gap-2.5"
            style={{
              borderColor: isDark ? 'rgba(251, 113, 133, 0.18)' : 'rgba(244, 63, 94, 0.15)',
              transform: 'translateZ(10px)',
            }}
          >
            {/* Retry Button: Icon + Text */}
            <motion.button
              type="button"
              onClick={handleRetryClick}
              whileHover={{ scale: 1.025, y: -0.5 }}
              whileTap={{ scale: 0.97, y: 0.5 }}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)'
                  : 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)',
                color: '#ffffff',
                boxShadow: isDark
                  ? '0 4px 14px -2px rgba(225, 29, 72, 0.4)'
                  : '0 4px 14px -2px rgba(190, 18, 60, 0.3)',
              }}
            >
              <motion.span
                animate={isRetrying ? { rotate: 360 } : { rotate: 0 }}
                transition={
                  isRetrying
                    ? { duration: 0.75, repeat: Infinity, ease: 'linear' }
                    : undefined
                }
                className="shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </motion.span>
              <span>Retry</span>
            </motion.button>

            {/* Support Button: Icon + Text */}
            {onOpenSupportHandover && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.025, y: -0.5 }}
                whileTap={{ scale: 0.97, y: 0.5 }}
                onClick={() =>
                  onOpenSupportHandover(
                    `Scholar Chat Assistance: "${error}"`,
                  )
                }
                className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 border shadow-sm transition-all"
                style={{
                  backgroundColor: isDark
                    ? 'rgba(16, 185, 129, 0.14)'
                    : 'rgba(16, 185, 129, 0.1)',
                  borderColor: isDark
                    ? 'rgba(16, 185, 129, 0.38)'
                    : 'rgba(5, 150, 105, 0.32)',
                  color: isDark ? '#6ee7b7' : '#047857',
                }}
                title="Connect with Human Support"
              >
                <PhoneCall className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Support</span>
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
