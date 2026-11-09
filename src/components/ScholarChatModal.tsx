import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Maximize2,
  MessageCircle,
  Minimize2,
  PenLine,
  PhoneForwarded,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import type {
  AuthenticatedUser,
  ScholarChatMessage,
  ThemeMode,
} from '../types';

interface ScholarChatModalProps {
  open: boolean;
  onClose: () => void;
  user: AuthenticatedUser;
  theme: ThemeMode;
  onScholarSpeakingChange: (speaking: boolean) => void;
  onOpenSupportHandover?: (topic?: string) => void;
  isFullScreen?: boolean;
  onFullScreenChange?: (fullScreen: boolean) => void;
  queuedPrompt?: { id: number; text: string } | null;
  onConsumeQueuedPrompt?: (id: number) => void;
}

export interface SuggestedQuestionItem {
  id: string;
  category: 'books' | 'study' | 'philosophy';
  label: string;
  question: string;
  icon?: 'book' | 'sparkle' | 'cat' | 'compass';
}

export const SUGGESTED_QUESTIONS: SuggestedQuestionItem[] = [
  {
    id: 'sofa-book',
    category: 'books',
    label: 'Current Reading',
    question: 'What book are you reading on the sofa?',
    icon: 'book',
  },
  {
    id: 'shelf-pdca',
    category: 'books',
    label: 'PDCA Management',
    question: 'What is the philosophy behind "経営はPDCAそのものである"?',
    icon: 'book',
  },
  {
    id: 'shelf-invention',
    category: 'books',
    label: 'Intellectual Invention',
    question: 'Why are books described as humanity’s greatest intellectual invention in the AI era?',
    icon: 'book',
  },
  {
    id: 'shelf-ai',
    category: 'books',
    label: 'AI & Business',
    question: 'How can small and medium enterprises bridge human aspiration with AI capability?',
    icon: 'book',
  },
  {
    id: 'shelf-education',
    category: 'books',
    label: 'Inclusion & Empathy',
    question: 'Can you tell me about the book "この子には障がいがあります"?',
    icon: 'book',
  },
  {
    id: 'cat-barnaby',
    category: 'study',
    label: 'Barnaby the Cat',
    question: 'Tell me about the orange cat sleeping next to you.',
    icon: 'cat',
  },
  {
    id: 'telescope-sky',
    category: 'study',
    label: 'Observatory & Sky',
    question: 'Why do you keep a telescope in this botanical observatory?',
    icon: 'compass',
  },
  {
    id: 'reading-advice',
    category: 'philosophy',
    label: 'Reading Advice',
    question: 'Which book on your shelves should I begin with today?',
    icon: 'sparkle',
  },
];

export type SuggestionCategory = 'all' | 'books' | 'study' | 'philosophy';

export const SUGGESTION_CATEGORIES: { key: SuggestionCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'books', label: 'Featured Books' },
  { key: 'study', label: 'Sanctuary & Cat' },
  { key: 'philosophy', label: 'Philosophy' },
];

// Framer Motion variants tailored to the app's 3D-motion spatial feel
const suggestionDrawerVariants: Variants = {
  hidden: {
    opacity: 0,
    height: 0,
    scale: 0.94,
    y: 16,
    rotateX: -4,
    transition: {
      duration: 0.22,
      ease: [0.32, 0, 0.67, 0],
    },
  },
  visible: {
    opacity: 1,
    height: 'auto',
    scale: 1,
    y: 0,
    rotateX: 0,
    transition: {
      type: 'spring',
      stiffness: 280,
      damping: 26,
      mass: 0.85,
      staggerChildren: 0.045,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    scale: 0.92,
    y: 14,
    rotateX: -5,
    transition: {
      duration: 0.22,
      ease: [0.36, 0, 0.66, -0.05],
      when: 'afterChildren',
      staggerChildren: 0.018,
      staggerDirection: -1,
    },
  },
};

const suggestionHeaderVariants: Variants = {
  hidden: { opacity: 0, y: -6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
  },
  exit: { opacity: 0, y: -4, transition: { duration: 0.12 } },
};

const suggestionGridVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.16,
      staggerChildren: 0.018,
      staggerDirection: -1,
    },
  },
};

const suggestionCardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 14,
    scale: 0.95,
    rotateX: -3,
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
      mass: 0.75,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    y: 8,
    transition: {
      duration: 0.15,
      ease: 'easeOut',
    },
  },
};

function formatTimeNow(): string {
  try {
    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Now';
  }
}

function buildInitialGreeting(userName: string, theme: ThemeMode): ScholarChatMessage {
  const firstName = userName.trim() ? userName.trim().split(' ')[0] : 'friend';
  const atmosphere =
    theme === 'dark'
      ? 'under this quiet starlit sky'
      : 'in this warm conservatory daylight';
  return {
    id: 'scholar-welcome-msg',
    role: 'scholar',
    text: `Ah, welcome ${firstName}! Come pull up a chair ${atmosphere}. Barnaby—my sleepy orange tabby here—barely stirred when you stepped in. Ask me anything about these botanical folios, the garden outside, or whatever is on your mind.`,
    timestamp: formatTimeNow(),
  };
}

export function ScholarChatModal({
  open,
  onClose,
  user,
  theme,
  onScholarSpeakingChange,
  onOpenSupportHandover,
  isFullScreen,
  onFullScreenChange,
  queuedPrompt,
  onConsumeQueuedPrompt,
}: ScholarChatModalProps) {
  const [messages, setMessages] = useState<ScholarChatMessage[]>(() => [
    buildInitialGreeting(user.name, theme),
  ]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [internalFullScreen, setInternalFullScreen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<SuggestionCategory>('all');

  const filteredSuggestions = useMemo(() => {
    if (selectedCategory === 'all') return SUGGESTED_QUESTIONS;
    return SUGGESTED_QUESTIONS.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  const handleSelectSuggestion = (promptText: string) => {
    void sendQuestion(promptText);
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setShowSuggestions(false);
    }
  };

  const handleInsertSuggestion = (e: React.MouseEvent, promptText: string) => {
    e.stopPropagation();
    setQuestion(promptText);
    inputRef.current?.focus();
  };

  const fullScreen = isFullScreen ?? internalFullScreen;

  const setFullScreenMode = (next: boolean) => {
    setInternalFullScreen(next);
    onFullScreenChange?.(next);
  };

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const speakingTimerRef = useRef<number | null>(null);
  const fullScreenRef = useRef<boolean>(fullScreen);
  fullScreenRef.current = fullScreen;

  // Focus question input when modal opens & trigger brief greeting nod
  useEffect(() => {
    if (!open) {
      onScholarSpeakingChange(false);
      return;
    }
    onScholarSpeakingChange(true);
    const greetTimer = window.setTimeout(() => {
      onScholarSpeakingChange(false);
    }, 2200);
    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 220);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (fullScreenRef.current) {
          setInternalFullScreen(false);
          onFullScreenChange?.(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(greetTimer);
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, onFullScreenChange, onScholarSpeakingChange]);

  useEffect(() => {
    return () => {
      if (speakingTimerRef.current) {
        window.clearTimeout(speakingTimerRef.current);
      }
    };
  }, []);

  // Auto-scroll to latest answer smoothly (including when toggling full-screen mode)
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollId = window.setTimeout(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, 60);
    return () => window.clearTimeout(scrollId);
  }, [messages, isLoading, fullScreen]);

  const sendQuestion = async (rawQuestion: string) => {
    const trimmed = rawQuestion.trim();
    if (!trimmed || isLoading) return;

    setErrorMsg(null);
    const userEntry: ScholarChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: formatTimeNow(),
    };

    const historySnapshot = messages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    setMessages((prev) => [...prev, userEntry]);
    setQuestion('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/scholar-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historySnapshot,
          theme,
          userName: user.name,
        }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };

      if (!response.ok || !data.reply) {
        throw new Error(
          data.error || 'Professor Linnea could not hear that clearly. Please try again.',
        );
      }

      const scholarEntry: ScholarChatMessage = {
        id: `scholar-${Date.now()}`,
        role: 'scholar',
        text: data.reply,
        timestamp: formatTimeNow(),
      };

      setMessages((prev) => [...prev, scholarEntry]);

      // Animate 3D Old Man speaking & nodding while delivering his answer
      if (speakingTimerRef.current) {
        window.clearTimeout(speakingTimerRef.current);
      }
      onScholarSpeakingChange(true);
      const speakDuration = Math.min(6000, Math.max(2600, data.reply.length * 24));
      speakingTimerRef.current = window.setTimeout(() => {
        onScholarSpeakingChange(false);
      }, speakDuration);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to reach Professor Linnea right now.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendQuestion(question);
  };

  useEffect(() => {
    if (!open || !queuedPrompt || isLoading) return;
    onConsumeQueuedPrompt?.(queuedPrompt.id);
    void sendQuestion(queuedPrompt.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, queuedPrompt]);

  const handleResetConversation = () => {
    setErrorMsg(null);
    setMessages([buildInitialGreeting(user.name, theme)]);
  };

  const handleToggleFullScreen = () => {
    setFullScreenMode(!fullScreen);
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 120);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.section
          key="scholar-conversation-modal"
          layout
          role="dialog"
          aria-modal={fullScreen ? 'true' : 'false'}
          aria-labelledby="scholar-modal-title"
          initial={{ opacity: 0, x: fullScreen ? 0 : 26, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: fullScreen ? 0 : 24, scale: 0.96 }}
          transition={{
            type: 'spring',
            stiffness: 290,
            damping: 28,
            layout: { type: 'spring', stiffness: 320, damping: 32 },
          }}
          className={
            fullScreen
              ? 'glass-chat-modal-surface glass-chat-modal-fullscreen fixed inset-0 z-45 rounded-none flex flex-col overflow-hidden pointer-events-auto'
              : 'glass-chat-modal-surface fixed inset-x-4 bottom-22 top-20 sm:inset-x-auto sm:right-8 sm:top-20 sm:bottom-24 sm:w-[425px] z-35 rounded-3xl flex flex-col overflow-hidden pointer-events-auto'
          }
        >
          {/* Specular glass top edge */}
          <div
            aria-hidden="true"
            className="chat-header-specular pointer-events-none absolute inset-x-8 top-0 h-px"
          />

          {/* Transparent Modal Header */}
          <div className="chat-divider-subtle border-b shrink-0 px-5 sm:px-6 py-4">
            <div
              className={`flex items-center justify-between gap-3 ${
                fullScreen ? 'w-full max-w-4xl mx-auto py-0.5' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="chat-icon-badge w-9 h-9 rounded-2xl flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="scholar-modal-title"
                    className={`chat-text-primary font-display font-semibold tracking-tight truncate ${
                      fullScreen ? 'text-lg sm:text-xl' : 'text-base'
                    }`}
                  >
                    Prof. Arthur Linnea
                  </h2>
                  <p className="chat-text-secondary text-xs truncate">
                    Botanist &amp; Study Keeper · Reading Sofa
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {onOpenSupportHandover && (
                  <button
                    type="button"
                    onClick={() => {
                      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
                      onOpenSupportHandover(lastUserMsg?.text || 'Assistance requested from Scholar Conversation');
                    }}
                    aria-label="Hand over to human support call"
                    title="Call Human Support (Handover)"
                    className="chat-control-btn h-9 px-2.5 sm:px-3 rounded-xl cursor-pointer flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 whitespace-nowrap shrink-0"
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    }}
                  >
                    <PhoneForwarded className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Call Support</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleToggleFullScreen}
                  aria-pressed={fullScreen}
                  aria-label={
                    fullScreen
                      ? 'Exit full screen chat modal'
                      : 'Expand chat modal to full screen'
                  }
                  title={fullScreen ? 'Exit full screen (Esc)' : 'Full screen'}
                  className="chat-control-btn h-9 px-2.5 sm:px-3 rounded-xl cursor-pointer flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                >
                  {fullScreen ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden sm:inline">Exit full screen</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden sm:inline">Full screen</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResetConversation}
                  aria-label="Reset conversation"
                  title="Start fresh conversation"
                  className="chat-control-btn w-9 h-9 rounded-xl cursor-pointer flex items-center justify-center shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close conversation modal"
                  title="Close conversation"
                  className="chat-control-btn w-9 h-9 rounded-xl cursor-pointer flex items-center justify-center shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Transparent Dialogue Stream */}
          <div
            ref={scrollContainerRef}
            className={`flex-1 overflow-y-auto ${
              fullScreen ? 'px-5 sm:px-8 py-6' : 'px-5 py-4'
            }`}
          >
            <div
              className={
                fullScreen
                  ? 'w-full max-w-4xl mx-auto space-y-4'
                  : 'space-y-3.5'
              }
            >
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px]">
                      <span className="chat-text-secondary font-semibold">
                        {isUser ? 'You' : 'Arthur Linnea'}
                      </span>
                      <span aria-hidden="true" className="chat-text-muted">
                        ·
                      </span>
                      <span className="chat-text-muted font-mono-tabular">
                        {msg.timestamp}
                      </span>
                    </div>

                    <div
                      className={`rounded-2xl px-4 py-2.5 leading-relaxed ${
                        fullScreen
                          ? 'max-w-[85%] sm:max-w-[74%] text-sm sm:text-[15px] sm:px-5 sm:py-3.5'
                          : 'max-w-[88%] text-sm'
                      } ${isUser ? 'chat-bubble-user' : 'chat-bubble-scholar'}`}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                );
              })}

              {/* Thinking state when Old Man is formulating an answer */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-start"
                >
                  <span className="chat-text-secondary text-[11px] font-semibold mb-1 px-1">
                    Arthur Linnea
                  </span>
                  <div className="chat-bubble-thinking rounded-2xl px-4 py-2.5 text-xs italic flex items-center gap-2">
                    <MessageCircle className="chat-accent-icon w-3.5 h-3.5 shrink-0" />
                    <span>Adjusting his reading glasses and pondering...</span>
                  </div>
                </motion.div>
              )}

              {/* Error Notice */}
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                  className="chat-error-banner rounded-2xl px-3.5 py-2.5 text-xs flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
            </div>
          </div>

          {/* Question Input Form with Interactive Suggest Question List */}
          <form
            onSubmit={handleSubmit}
            className={`chat-divider-subtle border-t shrink-0 ${
              fullScreen ? 'px-5 sm:px-8 py-3.5 sm:py-4' : 'p-3.5 sm:p-4'
            }`}
          >
            <div className={fullScreen ? 'w-full max-w-4xl mx-auto' : ''}>
              {/* Suggest Question List Collapsible Drawer */}
              <AnimatePresence>
                {showSuggestions && (
                  <motion.div
                    id="suggested-questions-panel"
                    variants={suggestionDrawerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    style={{ transformOrigin: 'bottom center', perspective: 800 }}
                    className="overflow-hidden mb-3"
                  >
                    <div className="chat-suggestion-panel rounded-2xl p-3 sm:p-3.5">
                      {/* Suggestion Header & Category Filters */}
                      <motion.div
                        variants={suggestionHeaderVariants}
                        className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b chat-divider-subtle"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-emerald-500/15 flex items-center justify-center shrink-0">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="text-xs font-semibold chat-text-primary tracking-tight">
                            Suggested Questions
                          </span>
                          <span className="text-[11px] chat-text-muted hidden sm:inline">
                            · Click to ask directly or edit below
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 ml-auto">
                          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                            {SUGGESTION_CATEGORIES.map((cat) => (
                              <button
                                key={cat.key}
                                type="button"
                                onClick={() => setSelectedCategory(cat.key)}
                                className={`text-[11px] px-2 py-0.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                                  selectedCategory === cat.key
                                    ? 'chat-suggestion-chip-active shadow-xs'
                                    : 'chat-suggestion-chip'
                                }`}
                              >
                                {cat.label}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowSuggestions(false)}
                            aria-label="Hide suggested questions"
                            title="Hide suggested questions"
                            className="chat-control-btn text-[11px] px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer shrink-0 ml-1"
                          >
                            <ChevronDown className="w-3 h-3" />
                            <span>Hide</span>
                          </button>
                        </div>
                      </motion.div>

                      {/* Question Card Grid with Staggered Entrance */}
                      <motion.div
                        key={selectedCategory}
                        variants={suggestionGridVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={`grid gap-1.5 overflow-y-auto pr-1 ${
                          fullScreen
                            ? 'grid-cols-1 sm:grid-cols-2 max-h-56'
                            : 'grid-cols-1 max-h-48'
                        }`}
                      >
                        {filteredSuggestions.map((item) => (
                          <motion.div
                            key={item.id}
                            variants={suggestionCardVariants}
                            whileHover={{ scale: 1.015, y: -1 }}
                            whileTap={{ scale: 0.985 }}
                            onClick={() => handleSelectSuggestion(item.question)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleSelectSuggestion(item.question);
                              }
                            }}
                            className="chat-suggestion-card group text-left p-2.5 rounded-xl cursor-pointer flex items-start justify-between gap-2.5 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                          >
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <div className="mt-0.5 w-6 h-6 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                {item.icon === 'cat' ? (
                                  <Sparkles className="w-3.5 h-3.5" />
                                ) : item.icon === 'compass' ? (
                                  <BookOpen className="w-3.5 h-3.5" />
                                ) : (
                                  <MessageCircle className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-[10px] font-semibold tracking-wider uppercase text-emerald-700 dark:text-emerald-300">
                                    {item.label}
                                  </span>
                                </div>
                                <p className="text-xs chat-text-primary leading-snug line-clamp-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                                  {item.question}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 mt-0.5">
                              <button
                                type="button"
                                onClick={(e) => handleInsertSuggestion(e, item.question)}
                                aria-label="Insert question into input box"
                                title="Insert into input to edit before asking"
                                className="chat-control-btn p-1 rounded-lg hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                              >
                                <PenLine className="w-3 h-3" />
                              </button>
                              <div className="p-1 text-emerald-600/60 dark:text-emerald-400/60 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all">
                                <ArrowRight className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          </motion.div>
                        ))}

                        {onOpenSupportHandover && (
                          <motion.div
                            variants={suggestionCardVariants}
                            whileHover={{ scale: 1.015, y: -1 }}
                            whileTap={{ scale: 0.985 }}
                            onClick={() => onOpenSupportHandover('Assistance requested from suggested questions')}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onOpenSupportHandover('Assistance requested from suggested questions');
                              }
                            }}
                            className="chat-suggestion-card group text-left p-2.5 rounded-xl cursor-pointer flex items-center justify-between gap-2.5 select-none border-emerald-500/30 hover:border-emerald-500/60"
                            style={{
                              backgroundColor: 'rgba(16, 185, 129, 0.08)',
                            }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                                <PhoneForwarded className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[10px] font-semibold tracking-wider uppercase text-emerald-700 dark:text-emerald-300 block">
                                  Human Support Handover
                                </span>
                                <p className="text-xs font-medium chat-text-primary truncate">
                                  Need assistance? Connect with a human specialist
                                </p>
                              </div>
                            </div>
                            <div className="p-1 text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0">
                              <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form Input Row with Show/Hide Suggestions Toggle Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSuggestions((prev) => !prev)}
                  aria-expanded={showSuggestions}
                  aria-controls="suggested-questions-panel"
                  aria-label={
                    showSuggestions
                      ? 'Hide suggested questions'
                      : 'Show suggested questions'
                  }
                  title={
                    showSuggestions
                      ? 'Hide suggested questions'
                      : 'Show suggested questions'
                  }
                  className={`chat-control-btn rounded-xl flex items-center gap-1.5 cursor-pointer font-medium transition-all shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                    showSuggestions
                      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30'
                      : ''
                  } ${
                    fullScreen
                      ? 'h-11 sm:h-12 px-3 sm:px-4 text-xs sm:text-sm'
                      : 'h-10 px-2.5 sm:px-3 text-xs'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="hidden sm:inline">Suggestions</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    {SUGGESTED_QUESTIONS.length}
                  </span>
                  {showSuggestions ? (
                    <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  )}
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={isLoading}
                  placeholder="Ask Prof. Linnea a question..."
                  aria-label="Ask Professor Arthur Linnea a question"
                  className={`glass-input flex-1 rounded-xl disabled:opacity-60 ${
                    fullScreen
                      ? 'px-4 py-3 text-sm sm:text-base'
                      : 'px-3.5 py-2.5 text-sm'
                  }`}
                />

                <button
                  type="submit"
                  disabled={isLoading || !question.trim()}
                  aria-label="Send question"
                  className={`btn-primary-theme rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap ${
                    fullScreen ? 'h-11 sm:h-12 px-5 sm:px-6' : 'h-10 px-4'
                  }`}
                >
                  <span>Ask</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </form>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

