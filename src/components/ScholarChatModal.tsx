import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Maximize2,
  MessageCircle,
  Minimize2,
  RotateCcw,
  Send,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
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
  isFullScreen?: boolean;
  onFullScreenChange?: (fullScreen: boolean) => void;
  queuedPrompt?: { id: number; text: string } | null;
  onConsumeQueuedPrompt?: (id: number) => void;
}

const SUGGESTED_QUESTIONS = [
  'What book are you reading on the sofa?',
  'Tell me about the orange cat sleeping next to you.',
  'Which book on your shelves should I read first?',
];

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

          {/* Quick Question Prompts (shown when conversation is fresh) */}
          {messages.length <= 2 && !isLoading && (
            <div
              className={`shrink-0 ${
                fullScreen ? 'px-5 sm:px-8 pb-3' : 'px-5 pb-2'
              }`}
            >
              <div
                className={`flex flex-wrap gap-1.5 ${
                  fullScreen ? 'w-full max-w-4xl mx-auto' : ''
                }`}
              >
                {SUGGESTED_QUESTIONS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendQuestion(prompt)}
                    className={`chat-control-btn text-left font-medium rounded-xl cursor-pointer ${
                      fullScreen
                        ? 'text-xs px-3.5 py-2'
                        : 'text-[11px] px-3 py-1.5'
                    }`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question Input Form */}
          <form
            onSubmit={handleSubmit}
            className={`chat-divider-subtle border-t shrink-0 ${
              fullScreen ? 'px-5 sm:px-8 py-4 sm:py-5' : 'p-4'
            }`}
          >
            <div
              className={`flex items-center gap-2.5 ${
                fullScreen ? 'w-full max-w-4xl mx-auto' : ''
              }`}
            >
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
          </form>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

