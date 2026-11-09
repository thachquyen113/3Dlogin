import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  Check,
  Compass,
  Eye,
  FileText,
  Filter,
  Library,
  Maximize2,
  MessageCircle,
  Minimize2,
  Search,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  HERBARIUM_CATEGORIES,
  NORTH_HERBARIUM_BOOKS,
  NORTH_HERBARIUM_SHELF_TIERS,
  type BookStudyNote,
  type HerbariumBookItem,
} from '../data/herbariumBooksData';
import type { ThemeMode } from '../types';

interface BookshelfBookListModalProps {
  open: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onFocusBookIn3D: (book: HerbariumBookItem) => void;
  onAskScholarAboutBook: (book: HerbariumBookItem) => void;
}

export function BookshelfBookListModal({
  open,
  onClose,
  theme,
  onFocusBookIn3D,
  onAskScholarAboutBook,
}: BookshelfBookListModalProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'inquiry-form'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<number>(-1);
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [sortBy, setSortBy] = useState<'default' | 'title' | 'author' | 'year'>('default');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [focusedBookDetail, setFocusedBookDetail] = useState<HerbariumBookItem | null>(null);

  // Form states for Book Study Note & Inquiry
  const [selectedFormBookId, setSelectedFormBookId] = useState<string>(
    NORTH_HERBARIUM_BOOKS[0].id,
  );
  const [noteType, setNoteType] = useState<BookStudyNote['noteType']>('reading-list');
  const [noteText, setNoteText] = useState('');
  const [userNotes, setUserNotes] = useState<BookStudyNote[]>([
    {
      id: 'init-note-1',
      bookId: 'hb-0-1',
      bookTitle: 'Flora Borealis: Illustrated Atlas',
      author: 'Carl von Linné',
      noteType: 'reading-list',
      note: 'Cross-reference Linné’s northern subarctic moss taxonomy with Paxton’s greenhouse thermal notes.',
      createdAt: 'Today · Study Session',
    },
  ]);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Keyboard shortcut: Escape to close or exit fullscreen
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullScreen) {
          setIsFullScreen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isFullScreen, onClose]);

  // Focus search input when modal opens
  useEffect(() => {
    if (open) {
      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 160);
    }
  }, [open]);

  // Filter and sort books
  const filteredBooks = useMemo(() => {
    let list = [...NORTH_HERBARIUM_BOOKS];

    // Filter by tier
    if (selectedTier !== -1) {
      list = list.filter((b) => b.tierIndex === selectedTier);
    }

    // Filter by category
    if (selectedCategory !== 'All Categories') {
      list = list.filter((b) => b.category === selectedCategory);
    }

    // Filter by search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.edition.toLowerCase().includes(q) ||
          b.year.includes(q) ||
          b.category.toLowerCase().includes(q) ||
          b.summary.toLowerCase().includes(q),
      );
    }

    // Sort
    if (sortBy === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'author') {
      list.sort((a, b) => a.author.localeCompare(b.author));
    } else if (sortBy === 'year') {
      list.sort((a, b) => Number(a.year) - Number(b.year));
    }

    return list;
  }, [selectedTier, selectedCategory, searchQuery, sortBy]);

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    const book = NORTH_HERBARIUM_BOOKS.find((b) => b.id === selectedFormBookId);
    if (!book) return;

    const newNote: BookStudyNote = {
      id: `note-${Date.now()}`,
      bookId: book.id,
      bookTitle: book.title,
      author: book.author,
      noteType,
      note: noteText.trim(),
      createdAt: 'Just now · Saved',
    };

    setUserNotes((prev) => [newNote, ...prev]);
    setNoteText('');
    setFormSuccessMessage(`Study note saved for "${book.title}"!`);
    window.setTimeout(() => {
      setFormSuccessMessage(null);
    }, 3800);
  };

  const handleOpenNoteForBook = (book: HerbariumBookItem) => {
    setSelectedFormBookId(book.id);
    setActiveTab('inquiry-form');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="bookshelf-book-list-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs pointer-events-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            key="bookshelf-book-list-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bookshelf-modal-title"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 14 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={`glass-chat-modal-surface flex flex-col overflow-hidden relative ${
              isFullScreen
                ? 'w-full h-full rounded-none'
                : 'w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl border'
            }`}
            style={{
              borderColor: 'var(--border-glass)',
              backgroundColor: 'var(--bg-glass-card)',
            }}
          >
            {/* Top Specular Glass Gilt Line */}
            <div
              aria-hidden="true"
              className="chat-header-specular pointer-events-none absolute inset-x-8 top-0 h-px"
            />

            {/* Modal Header */}
            <header className="px-5 sm:px-8 pt-5 pb-4 border-b chat-divider-subtle shrink-0 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-xs">
                  <Library className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                      Left Ahead Bookshelf
                    </span>
                    <span className="text-xs chat-text-muted hidden sm:inline">
                      North Herbarium Wing · Position [-4.25, -3.52]
                    </span>
                  </div>
                  <h2
                    id="bookshelf-modal-title"
                    className="text-lg sm:text-xl font-display font-semibold tracking-tight chat-text-primary truncate"
                  >
                    North Herbarium Case — Book Catalog
                  </h2>
                </div>
              </div>

              {/* Header Controls */}
              <div className="flex items-center gap-2 ml-auto shrink-0">
                {/* Tab switch between Catalog & Study Note Form */}
                <div className="flex items-center p-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setActiveTab('catalog')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'catalog'
                        ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-xs font-semibold'
                        : 'chat-text-secondary hover:chat-text-primary'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Catalog ({NORTH_HERBARIUM_BOOKS.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('inquiry-form')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'inquiry-form'
                        ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-xs font-semibold'
                        : 'chat-text-secondary hover:chat-text-primary'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Study Notes ({userNotes.length})</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFullScreen((prev) => !prev)}
                  aria-label={isFullScreen ? 'Exit full screen' : 'Expand to full screen'}
                  title={isFullScreen ? 'Exit full screen' : 'Full screen'}
                  className="chat-control-btn w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
                >
                  {isFullScreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close book catalog modal"
                  title="Close modal (Esc)"
                  className="chat-control-btn w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* Main Modal Body */}
            {activeTab === 'catalog' ? (
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Search, Tier & Filter Toolbar */}
                <div className="px-5 sm:px-8 py-3.5 border-b chat-divider-subtle bg-emerald-500/[0.03] space-y-3 shrink-0">
                  {/* Search and Sort Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 chat-text-muted" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search books by title, author, year, or summary..."
                        className="glass-input w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          aria-label="Clear search query"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md chat-text-muted hover:chat-text-primary cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 text-xs chat-text-secondary">
                        <Filter className="w-3.5 h-3.5" />
                        <span>Sort:</span>
                      </div>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                        className="glass-input px-2.5 py-1.5 rounded-xl text-xs cursor-pointer"
                      >
                        <option value="default">Shelf Order (I–IV)</option>
                        <option value="title">Title (A–Z)</option>
                        <option value="author">Author (A–Z)</option>
                        <option value="year">Publication Year</option>
                      </select>
                    </div>
                  </div>

                  {/* Shelf Tier Selector Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                    {NORTH_HERBARIUM_SHELF_TIERS.map((tier) => {
                      const active = selectedTier === tier.index;
                      return (
                        <button
                          key={tier.index}
                          type="button"
                          onClick={() => setSelectedTier(tier.index)}
                          className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                            active
                              ? 'chat-suggestion-chip-active shadow-xs font-semibold'
                              : 'chat-suggestion-chip'
                          }`}
                        >
                          <span>{tier.label}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              active ? 'bg-white/20' : 'bg-emerald-500/15'
                            }`}
                          >
                            {tier.index === -1
                              ? NORTH_HERBARIUM_BOOKS.length
                              : NORTH_HERBARIUM_BOOKS.filter((b) => b.tierIndex === tier.index).length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Books Grid */}
                <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-5">
                  {filteredBooks.length === 0 ? (
                    <div className="py-16 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold chat-text-primary">
                        No volumes found matching &quot;{searchQuery}&quot;
                      </p>
                      <p className="text-xs chat-text-muted max-w-sm mx-auto">
                        Try clearing search terms or selecting &quot;All Shelves&quot; to browse the complete herbarium collection.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedTier(-1);
                          setSelectedCategory('All Categories');
                        }}
                        className="btn-primary-theme px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        Reset Search Filters
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {filteredBooks.map((book) => {
                        return (
                          <div
                            key={book.id}
                            className="chat-suggestion-card rounded-2xl p-4 transition-all flex flex-col justify-between gap-3 border hover:shadow-md"
                          >
                            {/* Top Details & Spine Swatch */}
                            <div className="flex items-start gap-3.5 min-w-0">
                              {/* Simulated Physical Book Spine Swatch with Gold Tooling */}
                              <div
                                className="w-7 h-28 rounded-lg shrink-0 flex flex-col justify-between items-center py-2 shadow-inner border border-black/15 relative overflow-hidden"
                                style={{ backgroundColor: book.color }}
                              >
                                {/* Gold Tooling Lines */}
                                <div
                                  className="w-full h-1"
                                  style={{ backgroundColor: book.accentColor, opacity: 0.8 }}
                                />
                                <div className="text-[9px] font-mono tracking-tighter text-white/80 rotate-90 whitespace-nowrap select-none font-semibold">
                                  {book.year}
                                </div>
                                <div
                                  className="w-full h-1"
                                  style={{ backgroundColor: book.accentColor, opacity: 0.8 }}
                                />
                              </div>

                              {/* Text Description */}
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
                                    {book.tierName.split('·')[0].trim()}
                                  </span>
                                  <span className="text-[11px] chat-text-muted">
                                    · {book.year}
                                  </span>
                                </div>
                                <h3 className="text-sm font-semibold chat-text-primary leading-tight">
                                  {book.title}
                                </h3>
                                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                  By {book.author}
                                </p>
                                <p className="text-[11px] chat-text-muted line-clamp-1">
                                  {book.edition} · {book.binding}
                                </p>
                                <p className="text-xs chat-text-secondary leading-relaxed line-clamp-2 pt-1">
                                  {book.summary}
                                </p>
                              </div>
                            </div>

                            {/* Book Action Buttons */}
                            <div className="pt-2 border-t chat-divider-subtle flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 chat-text-muted">
                                Slot X: {book.shelfSlotX.toFixed(2)}m
                              </span>

                              <div className="flex items-center gap-1.5 ml-auto">
                                <button
                                  type="button"
                                  onClick={() => handleOpenNoteForBook(book)}
                                  title="Add study note or inquiry for this book"
                                  className="chat-control-btn text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                  <span className="hidden sm:inline">Note</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onAskScholarAboutBook(book);
                                  }}
                                  title="Discuss this book with Professor Linnea"
                                  className="chat-control-btn text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  <span>Discuss</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onFocusBookIn3D(book);
                                  }}
                                  title="Locate & focus this book on the 3D bookshelf"
                                  className="btn-primary-theme text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer font-semibold"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Focus in 3D</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Study Note & Inquiry Form Tab */
              <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 max-w-3xl mx-auto w-full space-y-6">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Herbarium Study &amp; Archival Request Form</span>
                  </div>
                  <p className="text-xs chat-text-secondary leading-relaxed">
                    Attach research questions, field note reminders, or library conservation requests to any volume on the North Herbarium bookshelf.
                  </p>
                </div>

                {formSuccessMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-900 dark:text-emerald-100 text-xs flex items-center gap-2"
                  >
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{formSuccessMessage}</span>
                  </motion.div>
                )}

                <form onSubmit={handleSaveNote} className="space-y-4">
                  {/* Select Book */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="form-book-select"
                      className="block text-xs font-semibold chat-text-primary"
                    >
                      Selected Bookshelf Volume
                    </label>
                    <select
                      id="form-book-select"
                      value={selectedFormBookId}
                      onChange={(e) => setSelectedFormBookId(e.target.value)}
                      className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer"
                    >
                      {NORTH_HERBARIUM_BOOKS.map((b) => (
                        <option key={b.id} value={b.id}>
                          [{b.tierName.split('·')[0].trim()}] {b.title} — By {b.author} ({b.year})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Note Type */}
                  <div className="space-y-1.5">
                    <span className="block text-xs font-semibold chat-text-primary">
                      Inquiry / Record Type
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        {
                          id: 'reading-list',
                          label: 'Study Reading List',
                          desc: 'Add to ongoing research queue',
                        },
                        {
                          id: 'botanical-research',
                          label: 'Botanical Research',
                          desc: 'Cross-reference flora specimens',
                        },
                        {
                          id: 'preservation',
                          label: 'Archival Conservation',
                          desc: 'Leather & binding restoration log',
                        },
                      ].map((t) => {
                        const active = noteType === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setNoteType(t.id as typeof noteType)}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                              active
                                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100 ring-1 ring-emerald-500/40'
                                : 'chat-control-btn'
                            }`}
                          >
                            <span className="text-xs font-semibold block">{t.label}</span>
                            <span className="text-[11px] chat-text-muted block mt-0.5">
                              {t.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes Textarea */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="form-notes-input"
                      className="block text-xs font-semibold chat-text-primary"
                    >
                      Study Notes &amp; Observations
                    </label>
                    <textarea
                      id="form-notes-input"
                      rows={4}
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Record scholarly notes, leaf specimen references, or specific chapters to discuss with Professor Linnea..."
                      className="glass-input w-full p-3.5 rounded-xl text-xs sm:text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('catalog')}
                      className="chat-control-btn px-4 py-2.5 rounded-xl text-xs font-medium cursor-pointer"
                    >
                      Back to Catalog
                    </button>
                    <button
                      type="submit"
                      disabled={!noteText.trim()}
                      className="btn-primary-theme px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Save Study Note</span>
                    </button>
                  </div>
                </form>

                {/* Existing Notes History */}
                <div className="pt-6 border-t chat-divider-subtle space-y-3">
                  <h4 className="text-xs font-semibold chat-text-secondary uppercase tracking-wider">
                    Recent Study Notes ({userNotes.length})
                  </h4>
                  <div className="space-y-2">
                    {userNotes.map((note) => (
                      <div
                        key={note.id}
                        className="chat-suggestion-card rounded-xl p-3 border text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                            {note.bookTitle}
                          </span>
                          <span className="text-[10px] chat-text-muted">{note.createdAt}</span>
                        </div>
                        <p className="chat-text-primary leading-relaxed">{note.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
