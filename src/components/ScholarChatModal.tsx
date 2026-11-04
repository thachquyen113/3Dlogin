import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  MessageCircle,
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
}: ScholarChatModalProps) {
  const [messages, setMessages] = useState<ScholarChatMessage[]>(() => [
    buildInitialGreeting(user.name, theme),
  ]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const speakingTimerRef = useRef<number | null>(null);

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
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(greetTimer);
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, onScholarSpeakingChange]);

  useEffect(() => {
    return () => {
      if (speakingTimerRef.current) {
        window.clearTimeout(speakingTimerRef.current);
      }
    };
  }, []);

  // Auto-scroll to latest answer smoothly
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

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

  const handleResetConversation = () => {
    setErrorMsg(null);
    setMessages([buildInitialGreeting(user.name, theme)]);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.section
          key="scholar-conversation-modal"
          role="dialog"
          aria-modal="false"
          aria-labelledby="scholar-modal-title"
          initial={{ opacity: 0, x: 26, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 24, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 290, damping: 26 }}
          className="glass-chat-modal-surface fixed inset-x-4 bottom-22 top-20 sm:inset-x-auto sm:right-8 sm:top-20 sm:bottom-24 sm:w-[425px] z-35 rounded-3xl flex flex-col overflow-hidden pointer-events-auto"
        >
          {/* Specular glass top edge */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 top-0 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.78), transparent)',
            }}
          />

          {/* Transparent Modal Header */}
          <div
            className="px-5 py-4 border-b flex items-center justify-between gap-3 shrink-0"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: 'var(--bg-glass-subtle)',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--accent-primary)',
                }}
              >
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2
                  id="scholar-modal-title"
                  className="font-display text-base font-semibold tracking-tight truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Prof. Arthur Linnea
                </h2>
                <p
                  className="text-xs truncate"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Botanist &amp; Study Keeper · Reading Sofa
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleResetConversation}
                aria-label="Reset conversation"
                title="Start fresh conversation"
                className="p-2 rounded-xl cursor-pointer opacity-75 hover:opacity-100 transition-opacity"
                style={{
                  backgroundColor: 'var(--bg-glass-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close conversation modal"
                className="p-2 rounded-xl cursor-pointer opacity-75 hover:opacity-100 transition-opacity"
                style={{
                  backgroundColor: 'var(--bg-glass-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Transparent Dialogue Stream */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5"
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
                    <span
                      className="font-semibold"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {isUser ? 'You' : 'Arthur Linnea'}
                    </span>
                    <span aria-hidden="true" style={{ color: 'var(--text-muted)' }}>
                      ·
                    </span>
                    <span
                      className="font-mono-tabular"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {msg.timestamp}
                    </span>
                  </div>

                  <div
                    className="max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                    style={
                      isUser
                        ? {
                            backgroundColor: 'var(--accent-primary)',
                            color: 'var(--text-on-accent)',
                          }
                        : {
                            backgroundColor: 'var(--bg-chat-bubble-scholar)',
                            border: '1px solid var(--border-glass)',
                            color: 'var(--text-primary)',
                          }
                    }
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
                <span
                  className="text-[11px] font-semibold mb-1 px-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Arthur Linnea
                </span>
                <div
                  className="rounded-2xl px-4 py-2.5 text-xs italic flex items-center gap-2"
                  style={{
                    backgroundColor: 'var(--bg-chat-bubble-scholar)',
                    border: '1px solid var(--border-glass)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <MessageCircle
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: 'var(--accent-primary)' }}
                  />
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
                className="rounded-2xl px-3.5 py-2.5 text-xs flex items-start gap-2"
                style={{
                  backgroundColor: 'var(--bg-error-banner)',
                  border: '1px solid var(--border-error-banner)',
                  color: 'var(--text-error)',
                }}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
          </div>

          {/* Quick Question Prompts (shown when conversation is fresh) */}
          {messages.length <= 2 && !isLoading && (
            <div className="px-5 pb-2 flex flex-wrap gap-1.5 shrink-0">
              {SUGGESTED_QUESTIONS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendQuestion(prompt)}
                  className="text-left text-[11px] font-medium px-3 py-1.5 rounded-xl cursor-pointer transition-opacity hover:opacity-100 opacity-90"
                  style={{
                    backgroundColor: 'var(--bg-glass-subtle)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Question Input Form */}
          <form
            onSubmit={handleSubmit}
            className="p-4 border-t flex items-center gap-2 shrink-0"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={isLoading}
              placeholder="Ask Prof. Linnea a question..."
              aria-label="Ask Professor Arthur Linnea a question"
              className="glass-input flex-1 px-3.5 py-2.5 rounded-xl text-sm disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              aria-label="Send question"
              className="btn-primary-theme h-10 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap"
            >
              <span>Ask</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
