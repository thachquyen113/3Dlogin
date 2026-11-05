import { useEffect, useState } from 'react';
import {
  ArrowUpDown,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Library,
  MessageCircle,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  booksData,
  computeFeaturedBookCameraFocus,
  getSortedFeaturedBooks,
  type FeaturedBookEntry,
} from '../data/booksData';
import type {
  BookShelfSortMode,
  CustomCameraFocus,
  FeaturedBookId,
} from '../types';

const SORT_OPTIONS: ReadonlyArray<{
  id: BookShelfSortMode;
  label: string;
}> = [
  { id: 'curated', label: 'Curated' },
  { id: 'category', label: 'Topic' },
  { id: 'title', label: 'Title' },
  { id: 'color', label: 'Palette' },
];

function ResilientBookCover({
  book,
}: {
  book: FeaturedBookEntry;
}) {
  const [src, setSrc] = useState(book.coverUrl);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(book.coverUrl);
    setFailed(false);
  }, [book.coverUrl]);

  if (failed) {
    return (
      <div
        className="w-28 h-40 rounded-xl shrink-0 flex flex-col items-center justify-center p-3 text-center"
        style={{
          background: `linear-gradient(155deg, ${book.spineColor}, ${book.backColor})`,
          color: '#ffffff',
        }}
      >
        <BookOpen className="w-6 h-6 mb-1.5 opacity-90" />
        <span className="text-xs font-semibold leading-tight">
          {book.shortLabel}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={book.title}
      referrerPolicy="no-referrer"
      onError={() => {
        if (src !== book.remoteCoverUrl) {
          setSrc(book.remoteCoverUrl);
        } else {
          setFailed(true);
        }
      }}
      className="w-28 h-40 rounded-xl object-cover shrink-0 shadow-md"
      style={{ border: '1px solid var(--border-subtle)' }}
    />
  );
}

interface FeaturedBookOverlayProps {
  visibleBar: boolean;
  sortMode: BookShelfSortMode;
  selectedBookId: FeaturedBookId | null;
  onChangeSortMode: (mode: BookShelfSortMode) => void;
  onSelectBook: (bookId: FeaturedBookId, focus: CustomCameraFocus) => void;
  onClearSelectedBook: () => void;
  onAskScholarAboutBook: (book: FeaturedBookEntry) => void;
}

export function FeaturedBookOverlay({
  visibleBar,
  sortMode,
  selectedBookId,
  onChangeSortMode,
  onSelectBook,
  onClearSelectedBook,
  onAskScholarAboutBook,
}: FeaturedBookOverlayProps) {
  const sortedBooks = getSortedFeaturedBooks(sortMode);
  const selectedBook = selectedBookId ? booksData[selectedBookId] : null;
  const selectedIndex = selectedBook
    ? sortedBooks.findIndex((b) => b.id === selectedBook.id)
    : -1;

  useEffect(() => {
    if (!selectedBookId) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClearSelectedBook();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedBookId, onClearSelectedBook]);

  const handleStepBook = (delta: number) => {
    if (sortedBooks.length === 0) return;
    const nextIdx =
      selectedIndex < 0
        ? 0
        : (selectedIndex + delta + sortedBooks.length) % sortedBooks.length;
    const nextBook = sortedBooks[nextIdx];
    onSelectBook(nextBook.id, computeFeaturedBookCameraFocus(nextIdx));
  };

  return (
    <>
      {/* Compact Bottom-Center Shelf Sort & Featured Cover Selector above SceneDock */}
      <AnimatePresence>
        {visibleBar && (
          <motion.div
            key="bookshelf-sort-strip"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="glass-dock-surface fixed bottom-22 left-1/2 -translate-x-1/2 z-25 rounded-2xl px-3.5 py-2 flex flex-wrap items-center justify-center gap-2.5 max-w-[94vw] pointer-events-auto"
          >
            {/* Segmented Shelf Sort Controls */}
            <div className="flex items-center gap-1">
              <span
                className="flex items-center gap-1 text-[11px] font-semibold pr-1 whitespace-nowrap shrink-0"
                style={{ color: 'var(--text-muted)' }}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Sort Shelf</span>
              </span>
              {SORT_OPTIONS.map((opt) => {
                const active = sortMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeSortMode(opt.id)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0"
                    style={{
                      backgroundColor: active
                        ? 'var(--accent-primary)'
                        : 'transparent',
                      color: active
                        ? 'var(--text-on-accent)'
                        : 'var(--text-secondary)',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div
              aria-hidden="true"
              className="hidden md:block w-px h-4"
              style={{ backgroundColor: 'var(--border-subtle)' }}
            />

            {/* Direct Featured Cover Focus Buttons (ordered dynamically by active Sort Mode) */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-full">
              {sortedBooks.map((book, idx) => {
                const active = selectedBookId === book.id;
                return (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() =>
                      onSelectBook(book.id, computeFeaturedBookCameraFocus(idx))
                    }
                    className="px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0"
                    style={{
                      backgroundColor: active
                        ? 'var(--bg-glass-subtle)'
                        : 'transparent',
                      border: active
                        ? '1px solid var(--border-focus)'
                        : '1px solid transparent',
                      color: active
                        ? 'var(--text-primary)'
                        : 'var(--text-secondary)',
                    }}
                  >
                    <BookOpen
                      className="w-3 h-3 shrink-0"
                      style={{ color: book.accentColor }}
                    />
                    <span>{book.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transparent Right-Side Book Cover Inspector Card (keeps 3D shelf book unobstructed on left) */}
      <AnimatePresence>
        {selectedBook && (
          <motion.aside
            key={selectedBook.id}
            role="dialog"
            aria-modal="false"
            aria-labelledby="featured-book-modal-title"
            initial={{ opacity: 0, x: 24, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="glass-chat-modal-surface fixed inset-x-4 top-20 sm:inset-x-auto sm:right-8 sm:top-20 sm:w-[404px] z-35 rounded-3xl p-5 space-y-4 pointer-events-auto"
          >
            {/* Header with unboxed metadata & shelf steppers */}
            <div
              className="pb-3 border-b flex items-center justify-between gap-3"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div
                className="flex items-center gap-1.5 text-xs min-w-0 truncate"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span className="truncate">{selectedBook.category}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular shrink-0">
                  {selectedIndex + 1} / {sortedBooks.length}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleStepBook(-1)}
                  aria-label="Previous book on shelf"
                  className="p-1.5 rounded-xl cursor-pointer hover:opacity-100 opacity-80 transition-opacity"
                  style={{
                    backgroundColor: 'var(--bg-glass-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStepBook(1)}
                  aria-label="Next book on shelf"
                  className="p-1.5 rounded-xl cursor-pointer hover:opacity-100 opacity-80 transition-opacity"
                  style={{
                    backgroundColor: 'var(--bg-glass-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClearSelectedBook}
                  aria-label="Return to full bookshelf view"
                  className="p-1.5 rounded-xl cursor-pointer hover:opacity-100 opacity-80 transition-opacity"
                  style={{
                    backgroundColor: 'var(--bg-glass-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cover Jacket + Title & Author */}
            <div className="flex items-start gap-4">
              <ResilientBookCover book={selectedBook} />

              <div className="min-w-0 flex-1 space-y-1.5">
                <h2
                  id="featured-book-modal-title"
                  className="font-display text-base font-semibold leading-snug"
                  style={{ color: 'var(--text-primary)', textWrap: 'balance' }}
                >
                  {selectedBook.title}
                </h2>
                <p
                  className="text-xs font-medium leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {selectedBook.author}
                </p>
                <p
                  className="text-[11px] leading-snug"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {selectedBook.publisher}
                </p>
              </div>
            </div>

            {/* Obi Tagline & Concise Overview */}
            <div
              className="pt-3 border-t space-y-2"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <p
                className="text-xs font-semibold leading-relaxed"
                style={{ color: 'var(--text-primary)' }}
              >
                “{selectedBook.tagline}”
              </p>
              <p
                className="text-xs leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                {selectedBook.summary}
              </p>
            </div>

            {/* Primary & Secondary Actions */}
            <div className="pt-1 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => onAskScholarAboutBook(selectedBook)}
                className="btn-primary-theme flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Ask Prof. Linnea</span>
              </button>
              <button
                type="button"
                onClick={onClearSelectedBook}
                className="glass-input py-2.5 px-3.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90 whitespace-nowrap shrink-0"
              >
                <Library className="w-3.5 h-3.5 shrink-0" />
                <span>All Shelves</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
