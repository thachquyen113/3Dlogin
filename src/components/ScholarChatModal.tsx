import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Cat,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Compass,
  Cpu,
  FileText,
  HeartHandshake,
  History,
  Library,
  Lightbulb,
  Maximize2,
  MessageCircle,
  Minimize2,
  PenLine,
  PhoneForwarded,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import type {
  AttachedAttachmentRef,
  AuthenticatedUser,
  ScholarChatMessage,
  ThemeMode,
} from '../types';
import { AttachmentModal } from './AttachmentModal';
import { ScholarError3DAlert } from './ScholarError3DAlert';

interface ScholarChatModalProps {
  open: boolean;
  onClose: () => void;
  user: AuthenticatedUser;
  theme: ThemeMode;
  onScholarSpeakingChange: (speaking: boolean) => void;
  onOpenSupportHandover?: (topic?: string) => void;
  isFullScreen?: boolean;
  onFullScreenChange?: (fullScreen: boolean) => void;
  queuedPrompt?: { id: number; text: string; breadcrumb?: string[] } | null;
  onConsumeQueuedPrompt?: (id: number) => void;
}

export interface SuggestedQuestionItem {
  id: string;
  category: 'books' | 'study' | 'philosophy';
  label: string;
  question: string;
  icon:
    | 'book'
    | 'pdca'
    | 'library'
    | 'ai'
    | 'empathy'
    | 'cat'
    | 'compass'
    | 'lightbulb';
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
    icon: 'pdca',
  },
  {
    id: 'shelf-invention',
    category: 'books',
    label: 'Intellectual Invention',
    question: 'Why are books described as humanity’s greatest intellectual invention in the AI era?',
    icon: 'library',
  },
  {
    id: 'shelf-ai',
    category: 'books',
    label: 'AI & Business',
    question: 'How can small and medium enterprises bridge human aspiration with AI capability?',
    icon: 'ai',
  },
  {
    id: 'shelf-education',
    category: 'books',
    label: 'Inclusion & Empathy',
    question: 'Can you tell me about the book "この子には障がいがあります"?',
    icon: 'empathy',
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
    icon: 'lightbulb',
  },
];

function renderSuggestionIcon(icon: SuggestedQuestionItem['icon']) {
  switch (icon) {
    case 'cat':
      return <Cat className="w-3.5 h-3.5" />;
    case 'compass':
      return <Compass className="w-3.5 h-3.5" />;
    case 'pdca':
      return <TrendingUp className="w-3.5 h-3.5" />;
    case 'library':
      return <Library className="w-3.5 h-3.5" />;
    case 'ai':
      return <Cpu className="w-3.5 h-3.5" />;
    case 'empathy':
      return <HeartHandshake className="w-3.5 h-3.5" />;
    case 'lightbulb':
      return <Lightbulb className="w-3.5 h-3.5" />;
    case 'book':
    default:
      return <BookOpen className="w-3.5 h-3.5" />;
  }
}

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

interface TopicHistoryEntry {
  id: string;
  messageId: string;
  trail: string[];
  questionPreview: string;
  timestamp: string;
  suggestionCategory: SuggestionCategory;
}

const DEFAULT_WELCOME_TRAIL = ['Library', 'Reading Sofa', 'Welcome'];

function buildDefaultTopicHistory(): TopicHistoryEntry {
  return {
    id: 'topic-welcome',
    messageId: 'scholar-welcome-msg',
    trail: DEFAULT_WELCOME_TRAIL,
    questionPreview: 'Opening greeting from Prof. Linnea',
    timestamp: formatTimeNow(),
    suggestionCategory: 'all',
  };
}

function summarizeCustomTopic(text: string): string {
  const cleaned = text
    .replace(/[?!."「」『』]/g, '')
    .trim();
  if (!cleaned) return 'Current Inquiry';
  const words = cleaned.split(/\s+/).slice(0, 3).join(' ');
  return words.length > 24 ? `${words.slice(0, 22).trim()}…` : words;
}

function deriveTopicBreadcrumb(
  questionText: string,
  explicitTrail?: string[],
): { trail: string[]; suggestionCategory: SuggestionCategory } {
  if (explicitTrail && explicitTrail.length > 0) {
    const joined = explicitTrail.join(' ').toLowerCase();
    const cat: SuggestionCategory = joined.includes('article')
      ? 'all'
      : joined.includes('philosophy')
        ? 'philosophy'
        : joined.includes('sanctuary') || joined.includes('observatory')
          ? 'study'
          : joined.includes('featured') || joined.includes('botanical')
            ? 'books'
            : 'all';
    return { trail: explicitTrail, suggestionCategory: cat };
  }

  const lower = questionText.toLowerCase();

  // Check exact or close matches with curated suggested questions
  const matchedSuggestion = SUGGESTED_QUESTIONS.find(
    (s) =>
      s.question.toLowerCase() === lower ||
      lower.includes(s.label.toLowerCase()),
  );
  if (matchedSuggestion) {
    const middle =
      matchedSuggestion.category === 'books'
        ? 'Featured Books'
        : matchedSuggestion.category === 'study'
          ? 'Sanctuary & Cat'
          : 'Philosophy';
    return {
      trail: ['Library', middle, matchedSuggestion.label],
      suggestionCategory: matchedSuggestion.category,
    };
  }

  // Botanical / Flora / Herbarium context
  if (
    /botan|flora|plant|flower|garden|herbarium|fern|moss|orchid|lichen|leaf|trees|chelsea/.test(
      lower,
    )
  ) {
    return {
      trail: ['Library', 'Featured Books', 'Botanical Studies'],
      suggestionCategory: 'books',
    };
  }

  // Featured Japanese Volumes
  if (/pdca|経営|brainworks|ブレインワークス/.test(lower)) {
    return {
      trail: ['Library', 'Featured Books', 'PDCA Management'],
      suggestionCategory: 'books',
    };
  }
  if (/知的発明|intellectual invention|greatest/.test(lower)) {
    return {
      trail: ['Library', 'Featured Books', 'Intellectual Invention'],
      suggestionCategory: 'books',
    };
  }
  if (/人間がしたいこと|ai|enterprise|中小企業/.test(lower)) {
    return {
      trail: ['Library', 'Featured Books', 'AI & Business'],
      suggestionCategory: 'books',
    };
  }
  if (/障がい|disabilit|inclusion|akemi|akisato|empathy/.test(lower)) {
    return {
      trail: ['Library', 'Featured Books', 'Inclusion & Empathy'],
      suggestionCategory: 'books',
    };
  }

  // Cat & Study Room
  if (/barnaby|cat|tabby|kitty|orange/.test(lower)) {
    return {
      trail: ['Library', 'Sanctuary & Cat', 'Barnaby the Cat'],
      suggestionCategory: 'study',
    };
  }
  if (/telescope|star|sky|comet|moon|observatory|celestial|night|daylight/.test(lower)) {
    return {
      trail: ['Library', 'Sanctuary & Cat', 'Observatory & Sky'],
      suggestionCategory: 'study',
    };
  }
  if (/book|shelf|shelves|folio|manuscript|library|reading/.test(lower)) {
    return {
      trail: ['Library', 'Featured Books', 'Volume Inquiry'],
      suggestionCategory: 'books',
    };
  }
  if (/philosophy|advice|begin|meaning|wisdom|thought/.test(lower)) {
    return {
      trail: ['Library', 'Philosophy', 'Reading Guidance'],
      suggestionCategory: 'philosophy',
    };
  }

  return {
    trail: ['Library', 'Study Dialogue', summarizeCustomTopic(questionText)],
    suggestionCategory: 'all',
  };
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
  const [lastFailedQuestion, setLastFailedQuestion] = useState<string | null>(null);
  const [internalFullScreen, setInternalFullScreen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasOpenedSuggestions, setHasOpenedSuggestions] = useState(false);
  const [showSuggestionNotice, setShowSuggestionNotice] = useState(true);
  const [attachedItem, setAttachedItem] = useState<AttachedAttachmentRef | null>(null);
  const [attachmentPickerOpen, setAttachmentPickerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<SuggestionCategory>('all');
  const [activeBreadcrumb, setActiveBreadcrumb] = useState<string[]>(
    DEFAULT_WELCOME_TRAIL,
  );
  const [topicHistory, setTopicHistory] = useState<TopicHistoryEntry[]>(() => [
    buildDefaultTopicHistory(),
  ]);
  const [activeTopicId, setActiveTopicId] = useState<string>('topic-welcome');
  const [showTopicHistory, setShowTopicHistory] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(
    null,
  );
  const [activeTypingMessage, setActiveTypingMessage] = useState<{
    id: string;
    fullText: string;
    displayedLength: number;
  } | null>(null);

  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const attachmentPickerOpenRef = useRef<boolean>(false);
  attachmentPickerOpenRef.current = attachmentPickerOpen;

  const filteredSuggestions = useMemo(() => {
    if (selectedCategory === 'all') return SUGGESTED_QUESTIONS;
    return SUGGESTED_QUESTIONS.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  const handleSkipTyping = () => {
    if (activeTypingMessage) {
      setActiveTypingMessage(null);
      if (speakingTimerRef.current) {
        window.clearTimeout(speakingTimerRef.current);
      }
      onScholarSpeakingChange(false);
    }
  };

  const handleSelectSuggestion = (promptText: string) => {
    void sendQuestion(promptText);
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setShowSuggestions(false);
    }
  };

  const handleJumpToTopic = (entry: TopicHistoryEntry) => {
    setActiveBreadcrumb(entry.trail);
    setActiveTopicId(entry.id);
    setShowTopicHistory(false);
    const targetEl = messageRefs.current[entry.messageId];
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(entry.messageId);
      window.setTimeout(() => {
        setHighlightedMessageId((curr) =>
          curr === entry.messageId ? null : curr,
        );
      }, 1600);
    }
  };

  const handleBreadcrumbSegmentClick = (index: number, label: string) => {
    setShowTopicHistory(false);
    if (index === 0) {
      // Root "Library": reset filter to All and open suggestion shelf or scroll to top
      setSelectedCategory('all');
      setShowSuggestions(true);
      setHasOpenedSuggestions(true);
      setShowSuggestionNotice(false);
      return;
    }

    if (index === 1) {
      // Wing / Category segment: filter suggestions to matching wing
      const lower = label.toLowerCase();
      if (lower.includes('article')) {
        setSelectedCategory('all');
      } else if (lower.includes('book') || lower.includes('botanical')) {
        setSelectedCategory('books');
      } else if (lower.includes('cat') || lower.includes('sanctuary') || lower.includes('observatory')) {
        setSelectedCategory('study');
      } else if (lower.includes('philosophy')) {
        setSelectedCategory('philosophy');
      } else {
        setSelectedCategory('all');
      }
      setShowSuggestions(true);
      setHasOpenedSuggestions(true);
      setShowSuggestionNotice(false);
      return;
    }

    // Active leaf segment: toggle the conversation topic history drawer
    setShowTopicHistory((prev) => !prev);
  };

  const handleToggleSuggestions = () => {
    setShowSuggestions((prev) => {
      const next = !prev;
      if (next) {
        setHasOpenedSuggestions(true);
        setShowSuggestionNotice(false);
      }
      return next;
    });
  };

  const handleInsertSuggestion = (e: React.MouseEvent, promptText: string) => {
    e.stopPropagation();
    setQuestion(promptText);
    inputRef.current?.focus();
  };

  const handleSelectAttachment = (item: AttachedAttachmentRef) => {
    setAttachedItem(item);
    setShowSuggestionNotice(false);
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
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
      setActiveTypingMessage(null);
      setShowTopicHistory(false);
      setAttachmentPickerOpen(false);
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
        if (attachmentPickerOpenRef.current) {
          setAttachmentPickerOpen(false);
          return;
        }
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

  // Progressive typewriter effect for scholar's responses to enhance realistic presence
  useEffect(() => {
    if (!activeTypingMessage) return;

    const { fullText, displayedLength } = activeTypingMessage;

    if (displayedLength >= fullText.length) {
      const finishTimer = window.setTimeout(() => {
        setActiveTypingMessage(null);
        if (speakingTimerRef.current) {
          window.clearTimeout(speakingTimerRef.current);
        }
        onScholarSpeakingChange(false);
      }, 350);
      return () => window.clearTimeout(finishTimer);
    }

    onScholarSpeakingChange(true);

    const prevChar = fullText[displayedLength - 1];
    let delay = 16;
    if (prevChar === '.' || prevChar === '!' || prevChar === '?') {
      delay = 140;
    } else if (prevChar === ',' || prevChar === ';' || prevChar === '—') {
      delay = 65;
    } else if (prevChar === '\n') {
      delay = 100;
    }

    const timer = window.setTimeout(() => {
      setActiveTypingMessage((prev) => {
        if (!prev) return null;
        // Step faster on longer responses to maintain snappy conversational pace
        const step = prev.fullText.length > 250 ? 2 : 1;
        const nextLen = Math.min(prev.fullText.length, prev.displayedLength + step);
        return {
          ...prev,
          displayedLength: nextLen,
        };
      });

      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [activeTypingMessage, onScholarSpeakingChange]);

  // Auto-scroll to latest answer smoothly (including when toggling full-screen mode)
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollId = window.setTimeout(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, 60);
    return () => window.clearTimeout(scrollId);
  }, [messages, isLoading, fullScreen, activeTypingMessage]);

  const sendQuestion = async (
    rawQuestion: string,
    explicitBreadcrumb?: string[],
    explicitAttachment?: AttachedAttachmentRef | null,
  ) => {
    const itemToAttach =
      explicitAttachment !== undefined ? explicitAttachment : attachedItem;
    const rawTrimmed = rawQuestion.trim();
    const trimmed =
      rawTrimmed ||
      (itemToAttach
        ? itemToAttach.kind === 'article'
          ? `Could you share your thoughts on the article "${itemToAttach.title}" by ${itemToAttach.author}?`
          : `Could you share your insights on "${itemToAttach.title}" by ${itemToAttach.author}?`
        : '');
    if (!trimmed || isLoading) return;

    setErrorMsg(null);
    setLastFailedQuestion(null);
    setShowTopicHistory(false);
    const userMessageId = `user-${Date.now()}`;
    const timestampNow = formatTimeNow();
    const userEntry: ScholarChatMessage = {
      id: userMessageId,
      role: 'user',
      text: trimmed,
      timestamp: timestampNow,
      attachedItem: itemToAttach || undefined,
    };

    const attachmentDerivedBreadcrumb =
      !explicitBreadcrumb && itemToAttach
        ? itemToAttach.kind === 'article'
          ? ['Library', 'Sanctuary Articles', itemToAttach.category]
          : [
              'Library',
              itemToAttach.source === 'featured'
                ? 'Featured Books'
                : 'Botanical Studies',
              itemToAttach.source === 'featured'
                ? itemToAttach.shortLabel || itemToAttach.title
                : itemToAttach.category,
            ]
        : explicitBreadcrumb;

    const { trail, suggestionCategory } = deriveTopicBreadcrumb(
      trimmed,
      attachmentDerivedBreadcrumb,
    );
    const topicId = `topic-${Date.now()}`;
    setActiveBreadcrumb(trail);
    setActiveTopicId(topicId);
    setTopicHistory((prev) => [
      ...prev,
      {
        id: topicId,
        messageId: userMessageId,
        trail,
        questionPreview: itemToAttach
          ? `${itemToAttach.kind === 'article' ? '📄' : '📖'} ${itemToAttach.shortLabel || itemToAttach.title}: ${trimmed}`
          : trimmed,
        timestamp: timestampNow,
        suggestionCategory,
      },
    ]);

    const historySnapshot = messages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    setMessages((prev) => [...prev, userEntry]);
    setQuestion('');
    if (explicitAttachment === undefined) {
      setAttachedItem(null);
    }
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
          attachedItem: itemToAttach
            ? {
                kind: itemToAttach.kind,
                title: itemToAttach.title,
                author: itemToAttach.author,
                category: itemToAttach.category,
                summary: itemToAttach.summary,
                readTime: itemToAttach.readTime,
              }
            : undefined,
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
      setLastFailedQuestion(null);

      // Trigger progressive typing effect for scholar's response
      setActiveTypingMessage({
        id: scholarEntry.id,
        fullText: data.reply,
        displayedLength: 1,
      });

      // Animate 3D Old Man speaking & nodding while delivering his answer
      if (speakingTimerRef.current) {
        window.clearTimeout(speakingTimerRef.current);
      }
      onScholarSpeakingChange(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to reach Professor Linnea right now.';
      setErrorMsg(msg);
      setLastFailedQuestion(trimmed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryFailedQuestion = () => {
    if (!lastFailedQuestion) return;
    const q = lastFailedQuestion;
    setErrorMsg(null);
    setLastFailedQuestion(null);
    void sendQuestion(q);
  };

  const handleEditFailedQuestion = () => {
    if (lastFailedQuestion) {
      setQuestion(lastFailedQuestion);
    }
    setErrorMsg(null);
    setLastFailedQuestion(null);
    inputRef.current?.focus();
  };

  const handleDismissError = () => {
    setErrorMsg(null);
    setLastFailedQuestion(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendQuestion(question);
  };

  useEffect(() => {
    if (!open || !queuedPrompt || isLoading) return;
    onConsumeQueuedPrompt?.(queuedPrompt.id);
    void sendQuestion(queuedPrompt.text, queuedPrompt.breadcrumb);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, queuedPrompt]);

  const handleResetConversation = () => {
    setActiveTypingMessage(null);
    onScholarSpeakingChange(false);
    if (speakingTimerRef.current) {
      window.clearTimeout(speakingTimerRef.current);
    }
    setErrorMsg(null);
    setLastFailedQuestion(null);
    setShowTopicHistory(false);
    setAttachedItem(null);
    setAttachmentPickerOpen(false);
    setActiveBreadcrumb(DEFAULT_WELCOME_TRAIL);
    setActiveTopicId('topic-welcome');
    setTopicHistory([buildDefaultTopicHistory()]);
    setMessages([buildInitialGreeting(user.name, theme)]);
  };

  const handleToggleFullScreen = () => {
    setFullScreenMode(!fullScreen);
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 120);
  };

  return (
    <>
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

          {/* Transparent Modal Header with Topic Breadcrumb Navigation */}
          <div className="chat-divider-subtle border-b shrink-0 px-5 sm:px-6 pt-4 pb-3 relative">
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

            {/* Breadcrumb Context & History Navigation Strip */}
            <div
              className={`mt-2.5 pt-2.5 border-t chat-divider-subtle flex items-center justify-between gap-2 ${
                fullScreen ? 'w-full max-w-4xl mx-auto' : ''
              }`}
            >
              <nav
                aria-label="Conversation topic breadcrumb"
                className="flex items-center gap-1 min-w-0 overflow-x-auto scrollbar-none text-[11px]"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {activeBreadcrumb.map((segment, idx) => {
                    const isLast = idx === activeBreadcrumb.length - 1;
                    return (
                      <motion.div
                        key={`${idx}-${segment}`}
                        initial={{ opacity: 0, x: 6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -4 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="flex items-center gap-1 min-w-0 shrink-0"
                      >
                        {idx > 0 && (
                          <ChevronRight
                            aria-hidden="true"
                            className="w-3 h-3 chat-text-muted opacity-60 shrink-0"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => handleBreadcrumbSegmentClick(idx, segment)}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer whitespace-nowrap max-w-[140px] sm:max-w-[180px] truncate ${
                            isLast
                              ? 'font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                              : 'chat-text-secondary hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-500/5'
                          }`}
                          title={
                            idx === 0
                              ? 'Browse all library topics'
                              : idx === 1
                                ? `Explore ${segment} questions`
                                : `Topic: ${segment} (click to view topic history)`
                          }
                        >
                          {idx === 0 && (
                            <Library className="w-3 h-3 shrink-0 opacity-80" />
                          )}
                          <span className="truncate">{segment}</span>
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </nav>

              {/* Topic History Trail Toggle */}
              <button
                type="button"
                onClick={() => setShowTopicHistory((prev) => !prev)}
                aria-expanded={showTopicHistory}
                aria-label="Toggle conversation topic history"
                title="Jump to an earlier topic in this conversation"
                className={`chat-control-btn h-6 px-2 rounded-lg text-[10px] font-medium flex items-center gap-1 shrink-0 cursor-pointer ${
                  showTopicHistory
                    ? 'border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                    : ''
                }`}
              >
                <History className="w-3 h-3 shrink-0" />
                <span className="font-mono-tabular">{topicHistory.length}</span>
                {showTopicHistory ? (
                  <ChevronUp className="w-3 h-3 shrink-0" />
                ) : (
                  <ChevronDown className="w-3 h-3 shrink-0" />
                )}
              </button>
            </div>

            {/* Expandable Conversation Topic History Panel */}
            <AnimatePresence>
              {showTopicHistory && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className={`mt-2 chat-suggestion-panel rounded-2xl p-2.5 max-h-52 overflow-y-auto ${
                    fullScreen ? 'w-full max-w-4xl mx-auto' : ''
                  }`}
                >
                  <div className="flex items-center justify-between px-1.5 pb-1.5 mb-1.5 border-b chat-divider-subtle">
                    <span className="text-[10px] font-semibold uppercase tracking-wider chat-text-secondary">
                      Conversation Topic Trail
                    </span>
                    <span className="text-[10px] chat-text-muted">
                      Click any topic to jump to message
                    </span>
                  </div>
                  <div className="space-y-1">
                    {topicHistory.map((entry) => {
                      const isCurrent = entry.id === activeTopicId;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => handleJumpToTopic(entry)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                            isCurrent
                              ? 'bg-emerald-500/12 border border-emerald-500/30'
                              : 'hover:bg-emerald-500/8 border border-transparent'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 text-[11px] font-medium truncate">
                              {entry.trail.map((seg, sIdx) => (
                                <React.Fragment key={`${entry.id}-${sIdx}`}>
                                  {sIdx > 0 && (
                                    <ChevronRight className="w-2.5 h-2.5 chat-text-muted shrink-0" />
                                  )}
                                  <span
                                    className={
                                      sIdx === entry.trail.length - 1
                                        ? 'text-emerald-700 dark:text-emerald-300 font-semibold truncate'
                                        : 'chat-text-secondary truncate'
                                    }
                                  >
                                    {seg}
                                  </span>
                                </React.Fragment>
                              ))}
                            </div>
                            <p className="text-[10px] chat-text-muted truncate mt-0.5">
                              {entry.questionPreview}
                            </p>
                          </div>
                          <span className="text-[10px] chat-text-muted font-mono-tabular shrink-0">
                            {entry.timestamp}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
                const isTypingThis = activeTypingMessage?.id === msg.id;
                const displayText = isTypingThis
                  ? msg.text.slice(0, activeTypingMessage.displayedLength)
                  : msg.text;

                const isHighlighted = highlightedMessageId === msg.id;

                return (
                  <motion.div
                    key={msg.id}
                    ref={(el) => {
                      messageRefs.current[msg.id] = el;
                    }}
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
                      {isTypingThis ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          typing...
                        </span>
                      ) : (
                        <span className="chat-text-muted font-mono-tabular">
                          {msg.timestamp}
                        </span>
                      )}
                    </div>

                    <div
                      onClick={isTypingThis ? handleSkipTyping : undefined}
                      className={`rounded-2xl px-4 py-2.5 leading-relaxed relative transition-shadow duration-300 ${
                        fullScreen
                          ? 'max-w-[85%] sm:max-w-[74%] text-sm sm:text-[15px] sm:px-5 sm:py-3.5'
                          : 'max-w-[88%] text-sm'
                      } ${isUser ? 'chat-bubble-user' : 'chat-bubble-scholar'} ${
                        isTypingThis ? 'cursor-pointer select-text' : ''
                      } ${
                        isHighlighted
                          ? 'ring-2 ring-emerald-500/75 shadow-lg'
                          : ''
                      }`}
                      title={isTypingThis ? 'Click to reveal entire response' : undefined}
                    >
                      {msg.attachedItem && (
                        <div className="mb-2 rounded-xl px-2.5 py-2 flex items-center gap-2.5 bg-black/15 dark:bg-black/25 border border-white/15">
                          {msg.attachedItem.coverUrl ? (
                            <img
                              src={msg.attachedItem.coverUrl}
                              alt={msg.attachedItem.title}
                              className="w-7 h-9 rounded object-cover shrink-0 border border-white/20"
                            />
                          ) : (
                            <div
                              className="w-7 h-9 rounded shrink-0 flex items-center justify-center border border-white/20"
                              style={{ backgroundColor: msg.attachedItem.color }}
                            >
                              {msg.attachedItem.kind === 'article' ? (
                                <FileText className="w-3.5 h-3.5 text-white/90" />
                              ) : (
                                <BookOpen className="w-3.5 h-3.5 text-white/90" />
                              )}
                            </div>
                          )}
                          <div className="min-w-0 flex-1 text-left">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] uppercase tracking-wider font-semibold opacity-75">
                                {msg.attachedItem.kind === 'article'
                                  ? 'Article'
                                  : 'Book'}
                              </span>
                              {msg.attachedItem.readTime && (
                                <span className="text-[9px] opacity-70">
                                  · {msg.attachedItem.readTime}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-semibold leading-tight truncate">
                              {msg.attachedItem.title}
                            </p>
                            <p className="text-[10px] opacity-80 truncate">
                              {msg.attachedItem.author}
                            </p>
                          </div>
                        </div>
                      )}
                      <span className="whitespace-pre-wrap">{displayText}</span>

                      {/* Blinking Ink Cursor while Scholar is typing */}
                      {isTypingThis && (
                        <motion.span
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 0.65, repeat: Infinity, ease: 'easeInOut' }}
                          className="inline-block w-1.5 h-4 ml-1 align-middle rounded-full bg-emerald-600 dark:bg-emerald-400 shadow-xs"
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    {/* Quick Skip Typing Button during response streaming */}
                    {isTypingThis && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-emerald-600/80 dark:text-emerald-400/80 select-none"
                      >
                        <PenLine className="w-2.5 h-2.5 animate-pulse" />
                        <span>Writing response...</span>
                        <button
                          type="button"
                          onClick={handleSkipTyping}
                          className="underline hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer ml-1 font-medium"
                          title="Reveal full response immediately"
                        >
                          Skip
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}

              {/* Typing Presence Indicator when Scholar is formulating an answer */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex flex-col items-start"
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px]">
                    <span className="chat-text-secondary font-semibold">
                      Arthur Linnea
                    </span>
                    <span aria-hidden="true" className="chat-text-muted">
                      ·
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      typing...
                    </span>
                  </div>
                  <div className="chat-bubble-thinking rounded-2xl px-4 py-2.5 text-xs flex items-center gap-2.5 shadow-xs">
                    <div className="w-5 h-5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <PenLine className="w-3.5 h-3.5 animate-pulse" />
                    </div>
                    <span className="italic">
                      Professor Linnea is dipping his pen in ink and typing...
                    </span>
                    {/* Animated 3-dot typing wave */}
                    <div className="flex items-center gap-1 pl-0.5">
                      <motion.span
                        animate={{ y: [0, -3.5, 0], opacity: [0.35, 1, 0.35] }}
                        transition={{ duration: 0.75, repeat: Infinity, delay: 0 }}
                        className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"
                      />
                      <motion.span
                        animate={{ y: [0, -3.5, 0], opacity: [0.35, 1, 0.35] }}
                        transition={{ duration: 0.75, repeat: Infinity, delay: 0.2 }}
                        className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"
                      />
                      <motion.span
                        animate={{ y: [0, -3.5, 0], opacity: [0.35, 1, 0.35] }}
                        transition={{ duration: 0.75, repeat: Infinity, delay: 0.4 }}
                        className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 3D Animation Alert when Scholar cannot reply to user, with Retry button & HandOver */}
              <AnimatePresence>
                {errorMsg && (
                  <ScholarError3DAlert
                    error={errorMsg}
                    failedQuestion={lastFailedQuestion}
                    onRetry={handleRetryFailedQuestion}
                    onEdit={handleEditFailedQuestion}
                    onDismiss={handleDismissError}
                    onOpenSupportHandover={onOpenSupportHandover}
                    isFullScreen={fullScreen}
                    theme={theme}
                  />
                )}
              </AnimatePresence>
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
                          <motion.div
                            animate={{
                              rotate: [0, -8, 8, 0],
                              scale: [1, 1.1, 1],
                            }}
                            transition={{
                              duration: 2.8,
                              repeat: Infinity,
                              repeatDelay: 2.5,
                              ease: 'easeInOut',
                            }}
                            className="w-5 h-5 rounded-md bg-emerald-500/15 flex items-center justify-center shrink-0"
                          >
                            <Lightbulb className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          </motion.div>
                          <span className="text-xs font-semibold chat-text-primary tracking-tight">
                            Suggested Questions
                          </span>
                          <span className="text-[11px] chat-text-muted hidden sm:inline">
                            · Tap any prompt to ask
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
                              <motion.div
                                whileHover={{ rotate: [-6, 6, 0], scale: 1.12 }}
                                transition={{ duration: 0.35 }}
                                className="mt-0.5 w-7 h-7 rounded-xl bg-emerald-500/12 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 transition-colors"
                              >
                                {renderSuggestionIcon(item.icon)}
                              </motion.div>
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

              {/* Attached Book or Article Preview Strip above Chat Input Box */}
              <AnimatePresence>
                {attachedItem && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 25 }}
                    className="mb-2.5 chat-suggestion-panel rounded-2xl px-3 py-2 flex items-center justify-between gap-2.5 border border-emerald-500/35"
                  >
                    <button
                      type="button"
                      onClick={() => setAttachmentPickerOpen(true)}
                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
                      title="Click to switch attached book or article"
                    >
                      {attachedItem.coverUrl ? (
                        <img
                          src={attachedItem.coverUrl}
                          alt={attachedItem.title}
                          className="w-7 h-9 rounded-md object-cover shrink-0 border border-black/10 dark:border-white/15"
                        />
                      ) : (
                        <div
                          className="w-7 h-9 rounded-md shrink-0 flex items-center justify-center border border-white/20"
                          style={{ backgroundColor: attachedItem.color }}
                        >
                          {attachedItem.kind === 'article' ? (
                            <FileText className="w-3.5 h-3.5 text-white/90" />
                          ) : (
                            <BookOpen className="w-3.5 h-3.5 text-white/90" />
                          )}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                            {attachedItem.kind === 'article'
                              ? 'Attached Article'
                              : 'Attached Book'}
                          </span>
                          <span className="text-[10px] chat-text-muted truncate">
                            · {attachedItem.category}
                            {attachedItem.readTime
                              ? ` · ${attachedItem.readTime}`
                              : ''}
                          </span>
                        </div>
                        <p className="text-xs font-semibold chat-text-primary truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                          {attachedItem.title}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAttachedItem(null)}
                      aria-label="Remove attachment"
                      title="Remove attachment"
                      className="chat-control-btn w-7 h-7 rounded-lg flex items-center justify-center shrink-0 cursor-pointer hover:text-rose-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form Input Row with Animated Icon-Only Suggestions Trigger, Plus Book Attachment Inside Chat Box */}
              <div className="flex items-center gap-2">
                <div className="relative shrink-0">
                  {/* Floating Animated Notice Callout pointing to the icon */}
                  <AnimatePresence>
                    {!showSuggestions && showSuggestionNotice && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.9 }}
                        animate={{
                          opacity: 1,
                          y: [0, -4, 0],
                          scale: 1,
                        }}
                        exit={{ opacity: 0, y: 6, scale: 0.9 }}
                        transition={{
                          opacity: { duration: 0.25, delay: 0.45 },
                          scale: { duration: 0.25, delay: 0.45 },
                          y: {
                            duration: 2.2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: 0.7,
                          },
                        }}
                        className="absolute bottom-full left-0 mb-2.5 z-20 pointer-events-auto"
                      >
                        <div className="chat-suggestion-panel rounded-xl px-2.5 py-1.5 shadow-lg border border-emerald-500/40 flex items-center gap-1.5 whitespace-nowrap">
                          <motion.span
                            animate={{ rotate: [0, 18, -12, 0], scale: [1, 1.2, 1] }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              repeatDelay: 1.5,
                            }}
                            className="text-emerald-600 dark:text-emerald-400 flex items-center"
                          >
                            <Sparkles className="w-3 h-3" />
                          </motion.span>
                          <button
                            type="button"
                            onClick={handleToggleSuggestions}
                            className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 cursor-pointer hover:underline"
                          >
                            {SUGGESTED_QUESTIONS.length} Question Ideas
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowSuggestionNotice(false)}
                            aria-label="Dismiss question ideas notice"
                            className="ml-0.5 p-0.5 rounded opacity-55 hover:opacity-100 chat-text-secondary cursor-pointer"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        {/* Caret arrow pointing down to icon */}
                        <div
                          aria-hidden="true"
                          className="w-2 h-2 rotate-45 ml-4 -mt-1 border-r border-b border-emerald-500/40"
                          style={{ backgroundColor: 'var(--bg-glass-card)' }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Expanding Halo Pulse Ring to draw user attention when drawer is closed */}
                  {!showSuggestions && (
                    <motion.span
                      aria-hidden="true"
                      animate={{
                        scale: [1, 1.38, 1.5],
                        opacity: [0.55, 0.2, 0],
                      }}
                      transition={{
                        duration: 2.2,
                        repeat: Infinity,
                        repeatDelay: 1.1,
                        ease: 'easeOut',
                      }}
                      className="absolute inset-0 rounded-xl border-2 border-emerald-500/60 pointer-events-none"
                    />
                  )}

                  <motion.button
                    type="button"
                    onClick={handleToggleSuggestions}
                    whileHover={{ scale: 1.06, y: -1 }}
                    whileTap={{ scale: 0.94 }}
                    aria-expanded={showSuggestions}
                    aria-controls="suggested-questions-panel"
                    aria-label={
                      showSuggestions
                        ? 'Hide suggested questions'
                        : `Show ${SUGGESTED_QUESTIONS.length} suggested questions`
                    }
                    title={
                      showSuggestions
                        ? 'Hide suggested questions'
                        : `Suggested questions (${SUGGESTED_QUESTIONS.length} prompts)`
                    }
                    className={`chat-control-btn relative rounded-xl flex items-center justify-center cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                      showSuggestions
                        ? 'border-emerald-500/60 bg-emerald-500/18 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/25 shadow-sm'
                        : 'hover:border-emerald-500/45'
                    } ${
                      fullScreen
                        ? 'w-11 h-11 sm:w-12 sm:h-12'
                        : 'w-10 h-10'
                    }`}
                  >
                    {/* Animated Lightbulb / Sparkles Icon */}
                    <motion.span
                      animate={
                        showSuggestions
                          ? { rotate: 0, scale: 1.05 }
                          : {
                              rotate: [0, -12, 12, -8, 8, 0],
                              scale: [1, 1.14, 1, 1.08, 1],
                            }
                      }
                      transition={
                        showSuggestions
                          ? { duration: 0.2 }
                          : {
                              duration: 1.2,
                              repeat: Infinity,
                              repeatDelay: 2.6,
                              ease: 'easeInOut',
                            }
                      }
                      className="flex items-center justify-center text-emerald-600 dark:text-emerald-400"
                    >
                      {showSuggestions ? (
                        <Sparkles className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                      ) : (
                        <Lightbulb className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                      )}
                    </motion.span>

                    {/* Active Notification Beacon Dot until user notices / opens */}
                    {!showSuggestions && !hasOpenedSuggestions && (
                      <span
                        aria-hidden="true"
                        className="absolute -top-1 -right-1 flex h-2.5 w-2.5"
                      >
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 ring-2 ring-white/80 dark:ring-slate-900/80" />
                      </span>
                    )}
                  </motion.button>
                </div>

                {/* Chat Input Box with Integrated Plus (+) Attachment Button Inside */}
                <div
                  className={`glass-input flex-1 rounded-xl flex items-center gap-1.5 min-w-0 ${
                    fullScreen ? 'px-2 py-1.5' : 'px-1.5 py-1'
                  } ${isLoading ? 'opacity-60' : ''}`}
                >
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setAttachmentPickerOpen(true)}
                    disabled={isLoading}
                    aria-label="Attach a book or article to question"
                    title="Attach a book or article from the library"
                    className={`rounded-lg flex items-center justify-center shrink-0 cursor-pointer transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                      attachedItem
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                        : 'hover:bg-emerald-500/12 chat-text-secondary hover:text-emerald-700 dark:hover:text-emerald-300'
                    } ${fullScreen ? 'w-8 h-8 sm:w-9 sm:h-9' : 'w-8 h-8'}`}
                  >
                    <Plus className="w-4 h-4" />
                  </motion.button>

                  <input
                    ref={inputRef}
                    type="text"
                    value={question}
                    onChange={(e) => {
                      setQuestion(e.target.value);
                      if (e.target.value.trim()) {
                        setShowSuggestionNotice(false);
                      }
                    }}
                    disabled={isLoading}
                    placeholder={
                      attachedItem
                        ? `Ask about "${attachedItem.shortLabel || attachedItem.title}"...`
                        : 'Ask Prof. Linnea a question...'
                    }
                    aria-label="Ask Professor Arthur Linnea a question"
                    className={`flex-1 min-w-0 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 chat-text-primary placeholder:opacity-60 ${
                      fullScreen
                        ? 'px-1.5 py-1.5 text-sm sm:text-base'
                        : 'px-1 py-1.5 text-sm'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || (!question.trim() && !attachedItem)}
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

      {/* Searchable Attachment Library Modal with Book & Article Tabs */}
      <AttachmentModal
        open={open && attachmentPickerOpen}
        onClose={() => setAttachmentPickerOpen(false)}
        onSelectAttachment={handleSelectAttachment}
        selectedAttachment={attachedItem}
        theme={theme}
      />
    </>
  );
}

