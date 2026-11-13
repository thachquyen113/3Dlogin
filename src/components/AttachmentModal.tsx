import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  Clock,
  FileText,
  Library,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { SANCTUARY_ARTICLES } from '../data/articlesData';
import { FEATURED_BOOK_LIST } from '../data/booksData';
import { NORTH_HERBARIUM_BOOKS } from '../data/herbariumBooksData';
import type {
  AttachedAttachmentRef,
  AttachmentKind,
  ThemeMode,
} from '../types';

interface AttachmentModalProps {
  open: boolean;
  onClose: () => void;
  onSelectAttachment: (item: AttachedAttachmentRef) => void;
  selectedAttachment?: AttachedAttachmentRef | null;
  theme: ThemeMode;
}

type BookSourceFilter = 'all' | 'featured' | 'herbarium';
type ArticleGroupFilter = 'all' | 'botany' | 'strategy' | 'essays';

const UNIFIED_LIBRARY_BOOKS: AttachedAttachmentRef[] = [
  ...FEATURED_BOOK_LIST.map((book) => ({
    id: book.id,
    kind: 'book' as const,
    title: book.title,
    shortLabel: book.shortLabel,
    author: book.author,
    category: book.category,
    source: 'featured' as const,
    color: book.spineColor,
    coverUrl: book.coverUrl,
    summary: book.summary,
    metaLabel: `Featured Gallery · ${book.publisher}`,
  })),
  ...NORTH_HERBARIUM_BOOKS.map((book) => ({
    id: book.id,
    kind: 'book' as const,
    title: book.title,
    shortLabel: book.title,
    author: book.author,
    category: book.category,
    source: 'herbarium' as const,
    color: book.color,
    summary: book.summary,
    metaLabel: `${book.tierName} · ${book.year}`,
  })),
];

const UNIFIED_LIBRARY_ARTICLES: (AttachedAttachmentRef & {
  group: 'botany' | 'strategy' | 'essays';
})[] = SANCTUARY_ARTICLES.map((article) => ({
  id: article.id,
  kind: 'article' as const,
  title: article.title,
  shortLabel: article.shortLabel,
  author: article.author,
  category: article.category,
  source: 'journal' as const,
  color: article.color,
  summary: article.summary,
  metaLabel: `${article.publication} · ${article.year}`,
  readTime: article.readTime,
  group: article.group,
}));

export function AttachmentModal({
  open,
  onClose,
  onSelectAttachment,
  selectedAttachment,
  theme,
}: AttachmentModalProps) {
  const [activeTab, setActiveTab] = useState<AttachmentKind>('book');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookFilter, setBookFilter] = useState<BookSourceFilter>('all');
  const [articleFilter, setArticleFilter] = useState<ArticleGroupFilter>('all');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const bookTabRef = useRef<HTMLButtonElement | null>(null);
  const articleTabRef = useRef<HTMLButtonElement | null>(null);

  // Sync active tab with any existing attached item when modal opens
  useEffect(() => {
    if (open && selectedAttachment) {
      setActiveTab(selectedAttachment.kind);
    }
  }, [open, selectedAttachment]);

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 120);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open, onClose]);

  const filteredBooks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return UNIFIED_LIBRARY_BOOKS.filter((book) => {
      if (bookFilter !== 'all' && book.source !== bookFilter) {
        return false;
      }
      if (!query) return true;
      return (
        book.title.toLowerCase().includes(query) ||
        (book.shortLabel && book.shortLabel.toLowerCase().includes(query)) ||
        book.author.toLowerCase().includes(query) ||
        book.category.toLowerCase().includes(query) ||
        book.metaLabel.toLowerCase().includes(query) ||
        book.summary.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, bookFilter]);

  const filteredArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return UNIFIED_LIBRARY_ARTICLES.filter((article) => {
      if (articleFilter !== 'all' && article.group !== articleFilter) {
        return false;
      }
      if (!query) return true;
      return (
        article.title.toLowerCase().includes(query) ||
        (article.shortLabel && article.shortLabel.toLowerCase().includes(query)) ||
        article.author.toLowerCase().includes(query) ||
        article.category.toLowerCase().includes(query) ||
        article.metaLabel.toLowerCase().includes(query) ||
        article.summary.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, articleFilter]);

  const featuredCount = useMemo(
    () => UNIFIED_LIBRARY_BOOKS.filter((b) => b.source === 'featured').length,
    [],
  );
  const herbariumCount = useMemo(
    () => UNIFIED_LIBRARY_BOOKS.filter((b) => b.source === 'herbarium').length,
    [],
  );

  const activeItems = activeTab === 'book' ? filteredBooks : filteredArticles;
  const isDark = theme === 'dark';

  const handleSwitchTab = (tab: AttachmentKind, preserveTabFocus = false) => {
    setActiveTab(tab);
    if (preserveTabFocus) {
      window.requestAnimationFrame(() => {
        if (tab === 'book') {
          bookTabRef.current?.focus();
        } else {
          articleTabRef.current?.focus();
        }
      });
      return;
    }
    window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 40);
  };

  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    currentTab: AttachmentKind,
  ) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const nextTab: AttachmentKind =
        currentTab === 'book' ? 'article' : 'book';
      handleSwitchTab(nextTab, true);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="attachment-modal-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
          />

          {/* Modal Surface */}
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="glass-chat-modal-surface relative w-full max-w-xl max-h-[84vh] rounded-3xl flex flex-col overflow-hidden shadow-2xl border"
            style={{
              borderColor: isDark
                ? 'rgba(110, 231, 183, 0.22)'
                : 'rgba(16, 185, 129, 0.22)',
            }}
          >
            {/* Header */}
            <div className="chat-divider-subtle border-b px-5 pt-4 pb-3 shrink-0 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="chat-icon-badge w-9 h-9 rounded-2xl flex items-center justify-center shrink-0">
                    <Library className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3
                      id="attachment-modal-title"
                      className="chat-text-primary font-display text-base sm:text-lg font-semibold tracking-tight truncate"
                    >
                      Attach Library Reference
                    </h3>
                    <p className="chat-text-secondary text-xs truncate">
                      Research &amp; select a book or article for your question
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close attachment modal"
                  title="Close"
                  className="chat-control-btn w-8 h-8 rounded-xl cursor-pointer flex items-center justify-center shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Primary 2 Tabs: Book and Article */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <div
                  role="tablist"
                  aria-label="Attachment library type"
                  className="flex items-center gap-1.5"
                >
                  {(
                    [
                      {
                        key: 'book',
                        label: `Book (${UNIFIED_LIBRARY_BOOKS.length})`,
                        ref: bookTabRef,
                      },
                      {
                        key: 'article',
                        label: `Article (${UNIFIED_LIBRARY_ARTICLES.length})`,
                        ref: articleTabRef,
                      },
                    ] as const
                  ).map((tab) => {
                    const isActive = activeTab === tab.key;

                    return (
                      <button
                        key={tab.key}
                        ref={tab.ref}
                        id={`attachment-tab-${tab.key}`}
                        type="button"
                        role="tab"
                        tabIndex={isActive ? 0 : -1}
                        aria-selected={isActive}
                        aria-controls="attachment-tabpanel"
                        onClick={() => handleSwitchTab(tab.key)}
                        onKeyDown={(e) => handleTabKeyDown(e, tab.key)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-all whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                          isActive
                            ? 'chat-suggestion-chip-active shadow-xs'
                            : 'chat-suggestion-chip'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {selectedAttachment && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 truncate max-w-[200px]">
                    <Check className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {selectedAttachment.shortLabel || selectedAttachment.title}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Search Input & Sub-Filter Bar */}
            <div className="chat-divider-subtle border-b px-5 py-3 space-y-2.5 shrink-0">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 chat-text-muted absolute left-3.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    activeTab === 'book'
                      ? 'Research book name, author, or category...'
                      : 'Research article title, author, or topic...'
                  }
                  aria-label={
                    activeTab === 'book'
                      ? 'Search book name'
                      : 'Search article title'
                  }
                  className="glass-input w-full rounded-xl pl-10 pr-9 py-2.5 text-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    aria-label="Clear search"
                    className="absolute right-2.5 p-1 rounded-lg chat-text-muted hover:chat-text-primary cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                {activeTab === 'book' ? (
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    {(
                      [
                        {
                          key: 'all',
                          label: `All Volumes (${UNIFIED_LIBRARY_BOOKS.length})`,
                        },
                        {
                          key: 'featured',
                          label: `Featured (${featuredCount})`,
                        },
                        {
                          key: 'herbarium',
                          label: `Herbarium (${herbariumCount})`,
                        },
                      ] as const
                    ).map((filter) => (
                      <button
                        key={filter.key}
                        type="button"
                        onClick={() => setBookFilter(filter.key)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-all whitespace-nowrap ${
                          bookFilter === filter.key
                            ? 'chat-suggestion-chip-active shadow-xs'
                            : 'chat-suggestion-chip'
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    {(
                      [
                        {
                          key: 'all',
                          label: `All Articles (${UNIFIED_LIBRARY_ARTICLES.length})`,
                        },
                        {
                          key: 'botany',
                          label: 'Botany & Study',
                        },
                        {
                          key: 'strategy',
                          label: 'Management & AI',
                        },
                        {
                          key: 'essays',
                          label: 'Essays & Care',
                        },
                      ] as const
                    ).map((filter) => (
                      <button
                        key={filter.key}
                        type="button"
                        onClick={() => setArticleFilter(filter.key)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-all whitespace-nowrap ${
                          articleFilter === filter.key
                            ? 'chat-suggestion-chip-active shadow-xs'
                            : 'chat-suggestion-chip'
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                )}

                <span className="text-[11px] chat-text-muted font-mono-tabular">
                  {activeItems.length}{' '}
                  {activeTab === 'book'
                    ? activeItems.length === 1
                      ? 'book'
                      : 'books'
                    : activeItems.length === 1
                      ? 'article'
                      : 'articles'}
                </span>
              </div>
            </div>

            {/* Scrollable Attachment List */}
            <div
              id="attachment-tabpanel"
              role="tabpanel"
              aria-labelledby={`attachment-tab-${activeTab}`}
              className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 space-y-2"
            >
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-2"
              >
              {activeItems.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <div className="w-10 h-10 rounded-2xl mx-auto flex items-center justify-center chat-icon-badge opacity-75">
                    {activeTab === 'book' ? (
                      <BookOpen className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>
                  <p className="text-sm font-medium chat-text-primary">
                    {activeTab === 'book'
                      ? 'No matching books found'
                      : 'No matching articles found'}
                  </p>
                  <p className="text-xs chat-text-muted max-w-xs mx-auto">
                    Try searching another title, author, or switch the category tab.
                  </p>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Clear search query
                    </button>
                  )}
                </div>
              ) : (
                activeItems.map((item) => {
                  const isAttached = selectedAttachment?.id === item.id;
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      whileHover={{ scale: 1.01, y: -1 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => {
                        onSelectAttachment(item);
                        onClose();
                      }}
                      className={`chat-suggestion-card w-full text-left p-3 rounded-2xl cursor-pointer flex items-start gap-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                        isAttached
                          ? 'border-emerald-500/60 ring-1 ring-emerald-500/35 bg-emerald-500/10'
                          : ''
                      }`}
                    >
                      {/* Thumbnail / Book Spine / Article Folio Visual */}
                      {item.coverUrl ? (
                        <div className="w-10 h-13 rounded-lg overflow-hidden shrink-0 border border-black/10 dark:border-white/10 shadow-xs bg-slate-200 dark:bg-slate-800">
                          <img
                            src={item.coverUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : item.kind === 'article' ? (
                        <div
                          className="w-10 h-12 rounded-xl shrink-0 flex items-center justify-center border border-white/20 shadow-xs relative overflow-hidden"
                          style={{ backgroundColor: item.color }}
                        >
                          <FileText className="w-4 h-4 text-white/95" />
                        </div>
                      ) : (
                        <div
                          className="w-10 h-13 rounded-lg shrink-0 flex items-center justify-center border border-white/20 shadow-xs relative overflow-hidden"
                          style={{ backgroundColor: item.color }}
                        >
                          <div className="absolute inset-y-0 left-1 w-[2px] bg-white/25" />
                          <BookOpen className="w-4 h-4 text-white/90" />
                        </div>
                      )}

                      {/* Item Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs sm:text-[13px] font-semibold chat-text-primary leading-snug line-clamp-1">
                            {item.title}
                          </h4>
                          <span
                            className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                              isAttached
                                ? 'bg-emerald-500 text-white'
                                : 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            {isAttached ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Attached</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>Attach</span>
                              </>
                            )}
                          </span>
                        </div>

                        <p className="text-[11px] chat-text-secondary truncate mt-0.5">
                          {item.author}
                        </p>

                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                            {item.source === 'featured' && (
                              <Sparkles className="w-2.5 h-2.5" />
                            )}
                            {item.category}
                          </span>

                          {item.readTime && (
                            <span className="inline-flex items-center gap-1 text-[10px] chat-text-muted">
                              <Clock className="w-2.5 h-2.5" />
                              {item.readTime}
                            </span>
                          )}

                          <span className="text-[10px] chat-text-muted truncate">
                            {item.metaLabel}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  );
                })
              )}
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
