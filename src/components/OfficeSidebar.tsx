import {
  ArrowUpDown,
  BookOpen,
  Compass,
  Headphones,
  Lamp,
  Library,
  LogOut,
  Menu,
  MessageCircle,
  Monitor,
  Moon,
  PhoneCall,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  computeFeaturedBookCameraFocus,
  getSortedFeaturedBooks,
} from '../data/booksData';
import type {
  AuthenticatedUser,
  BookShelfSortMode,
  CameraPreset,
  CustomCameraFocus,
  FeaturedBookId,
  OfficeCameraPreset,
  ThemeMode,
} from '../types';

interface OfficeSidebarProps {
  open: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
  user: AuthenticatedUser;
  theme: ThemeMode;
  onSelectTheme: (theme: ThemeMode) => void;
  cameraPreset: CameraPreset;
  shelfSortMode: BookShelfSortMode;
  selectedBookId: FeaturedBookId | null;
  onSelectCamera: (preset: OfficeCameraPreset) => void;
  onChangeSortMode: (mode: BookShelfSortMode) => void;
  onSelectFeaturedBook: (bookId: FeaturedBookId, focus: CustomCameraFocus) => void;
  lampsOn: boolean;
  onToggleLamps: () => void;
  onOpenScholarChat: () => void;
  onOpenSupportHandover: (topic?: string) => void;
  onReopenWelcome: () => void;
  onSignOut: () => void;
}

const ROOM_VIEWS: Array<{
  id: OfficeCameraPreset;
  label: string;
  subtitle: string;
  icon: typeof Compass;
}> = [
  {
    id: 'office-overview',
    label: 'Study Overview',
    subtitle: 'Full room & conservatory window',
    icon: Compass,
  },
  {
    id: 'office-sofa',
    label: 'Reading Sofa',
    subtitle: 'Prof. Linnea & sleeping orange cat',
    icon: BookOpen,
  },
  {
    id: 'office-desk',
    label: 'Computer Desk',
    subtitle: 'Workstation & studio monitor',
    icon: Monitor,
  },
  {
    id: 'office-books',
    label: 'Library Shelves',
    subtitle: 'Walnut bookcases & globe',
    icon: Library,
  },
];

export function OfficeSidebar({
  open,
  onToggleOpen,
  onClose,
  user,
  theme,
  onSelectTheme,
  cameraPreset,
  shelfSortMode,
  selectedBookId,
  onSelectCamera,
  onChangeSortMode,
  onSelectFeaturedBook,
  lampsOn,
  onToggleLamps,
  onOpenScholarChat,
  onOpenSupportHandover,
  onReopenWelcome,
  onSignOut,
}: OfficeSidebarProps) {
  const sortedBooks = getSortedFeaturedBooks(shelfSortMode);
  return (
    <>
      {/* Top-Left Sidebar Menu Trigger Icon */}
      <button
        type="button"
        onClick={onToggleOpen}
        aria-label={open ? 'Close left sidebar menu' : 'Open left sidebar menu'}
        aria-expanded={open}
        className="theme-toggle-shell fixed top-5 left-6 z-40 h-11 px-3.5 rounded-2xl flex items-center gap-2.5 cursor-pointer pointer-events-auto backdrop-blur-md hover:opacity-95"
        style={{ color: 'var(--text-primary)' }}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        <span className="text-xs font-semibold tracking-tight hidden sm:inline whitespace-nowrap">
          {open ? 'Close Menu' : 'Study Menu'}
        </span>
      </button>

      {/* Transparent Glassmorphic Left Sidebar Drawer over Live 3D Background */}
      <AnimatePresence>
        {open && (
          <motion.aside
            key="office-left-sidebar"
            aria-label="Study navigation sidebar"
            initial={{ x: '-100%', opacity: 0.4 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0.3 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            className="glass-sidebar-surface fixed top-0 left-0 bottom-0 z-30 w-76 sm:w-82 pt-20 pb-6 px-5 flex flex-col justify-between overflow-y-auto pointer-events-auto"
          >
            <div className="space-y-6">
              {/* Brand & Active Room Title */}
              <div
                className="pb-4 border-b space-y-1"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-display text-lg font-semibold tracking-tight"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Sylva Sanctuary
                  </span>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Dismiss sidebar"
                    className="p-1.5 rounded-lg cursor-pointer opacity-70 hover:opacity-100"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  3D Scholar&apos;s Office &amp; Library
                </p>
              </div>

              {/* Camera Viewpoints */}
              <div className="space-y-2">
                <p
                  className="text-xs font-semibold px-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  3D Camera Spaces
                </p>
                <nav className="space-y-1.5" aria-label="3D Office Viewpoints">
                  {ROOM_VIEWS.map((item) => {
                    const Icon = item.icon;
                    const active = cameraPreset === item.id && !selectedBookId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectCamera(item.id)}
                        className="w-full px-3.5 py-2.5 rounded-2xl flex items-center gap-3 text-left transition-all duration-200 cursor-pointer"
                        style={{
                          backgroundColor: active
                            ? 'var(--accent-primary)'
                            : 'var(--bg-glass-subtle)',
                          color: active
                            ? 'var(--text-on-accent)'
                            : 'var(--text-primary)',
                          border: active
                            ? '1px solid transparent'
                            : '1px solid var(--border-subtle)',
                        }}
                      >
                        <Icon
                          className="w-4 h-4 shrink-0"
                          style={{
                            color: active
                              ? 'var(--text-on-accent)'
                              : 'var(--accent-primary)',
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold truncate">
                            {item.label}
                          </div>
                          <div
                            className="text-[11px] truncate"
                            style={{
                              color: active
                                ? 'var(--text-on-accent)'
                                : 'var(--text-secondary)',
                              opacity: active ? 0.88 : 1,
                            }}
                          >
                            {item.subtitle}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Featured Cover Books & Shelf Sort */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <p
                    className="text-xs font-semibold"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Featured Shelf Covers
                  </p>
                  <span
                    className="flex items-center gap-1 text-[11px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    <span>Sort</span>
                  </span>
                </div>

                {/* Segmented Sort Control */}
                <div
                  className="grid grid-cols-4 gap-1 p-1 rounded-xl"
                  style={{
                    backgroundColor: 'var(--bg-glass-subtle)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {(
                    [
                      { id: 'curated', label: 'Default' },
                      { id: 'category', label: 'Topic' },
                      { id: 'title', label: 'Title' },
                      { id: 'color', label: 'Color' },
                    ] as const
                  ).map((opt) => {
                    const active = shelfSortMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChangeSortMode(opt.id)}
                        className="py-1 px-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap truncate"
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

                {/* Sorted Featured Book Items */}
                <div className="space-y-1.5">
                  {sortedBooks.map((book, idx) => {
                    const active = selectedBookId === book.id;
                    return (
                      <button
                        key={book.id}
                        type="button"
                        onClick={() =>
                          onSelectFeaturedBook(
                            book.id,
                            computeFeaturedBookCameraFocus(idx),
                          )
                        }
                        className="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-left transition-colors cursor-pointer"
                        style={{
                          backgroundColor: active
                            ? 'var(--accent-primary)'
                            : 'var(--bg-glass-subtle)',
                          color: active
                            ? 'var(--text-on-accent)'
                            : 'var(--text-primary)',
                          border: active
                            ? '1px solid transparent'
                            : '1px solid var(--border-subtle)',
                        }}
                      >
                        <BookOpen
                          className="w-3.5 h-3.5 shrink-0"
                          style={{
                            color: active
                              ? 'var(--text-on-accent)'
                              : book.accentColor,
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold truncate">
                            {book.title}
                          </div>
                          <div
                            className="text-[11px] truncate"
                            style={{
                              color: active
                                ? 'var(--text-on-accent)'
                                : 'var(--text-secondary)',
                              opacity: active ? 0.88 : 1,
                            }}
                          >
                            {book.category}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scholar Conversation Action */}
              <div className="space-y-2">
                <p
                  className="text-xs font-semibold px-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Study Companion
                </p>
                <button
                  type="button"
                  onClick={onOpenScholarChat}
                  className="btn-primary-theme w-full px-3.5 py-2.5 rounded-2xl flex items-center gap-3 text-left cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate">
                      Talk with Prof. Linnea
                    </div>
                    <div className="text-[11px] truncate opacity-90">
                      Ask the scholar a question
                    </div>
                  </div>
                </button>
              </div>

              {/* HandOver: Human Support Voice Call */}
              <div className="space-y-2">
                <p
                  className="text-xs font-semibold px-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Human Support Handover
                </p>
                <button
                  type="button"
                  onClick={() => onOpenSupportHandover('Handover from Study Menu')}
                  className="w-full px-3.5 py-2.5 rounded-2xl flex items-center gap-3 text-left cursor-pointer border transition-colors"
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderColor: 'rgba(16, 185, 129, 0.35)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--text-on-accent)',
                    }}
                  >
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                      <span>Call Human Support</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    </div>
                    <div className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
                      Direct audio call with curator
                    </div>
                  </div>
                </button>
              </div>

              {/* Study Atmosphere Controls */}
              <div className="space-y-2.5">
                <p
                  className="text-xs font-semibold px-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Study Atmosphere
                </p>

                {/* Toggle Indoor Brass Lamps */}
                <button
                  type="button"
                  onClick={onToggleLamps}
                  className="w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-medium cursor-pointer transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-glass-subtle)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span className="flex items-center gap-2.5">
                    <Lamp
                      className="w-4 h-4"
                      style={{
                        color: lampsOn
                          ? 'var(--accent-celestial)'
                          : 'var(--text-muted)',
                      }}
                    />
                    <span>Reading &amp; Desk Lamps</span>
                  </span>
                  <span
                    className="font-mono-tabular text-[11px] font-semibold"
                    style={{
                      color: lampsOn ? 'var(--accent-primary)' : 'var(--text-muted)',
                    }}
                  >
                    {lampsOn ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* Quick Window Sky Mode Switch */}
                <button
                  type="button"
                  onClick={() => onSelectTheme(theme === 'light' ? 'dark' : 'light')}
                  className="w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-medium cursor-pointer transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-glass-subtle)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span className="flex items-center gap-2.5">
                    {theme === 'light' ? (
                      <Sun
                        className="w-4 h-4"
                        style={{ color: 'var(--accent-celestial)' }}
                      />
                    ) : (
                      <Moon
                        className="w-4 h-4"
                        style={{ color: 'var(--accent-celestial)' }}
                      />
                    )}
                    <span>Window Sky Theme</span>
                  </span>
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {theme === 'light' ? 'Sunlit Day' : 'Starlit Night'}
                  </span>
                </button>

                {/* Re-open Welcome Card */}
                <button
                  type="button"
                  onClick={onReopenWelcome}
                  className="w-full px-3.5 py-2.5 rounded-2xl flex items-center gap-2.5 text-xs font-medium cursor-pointer transition-colors hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--bg-glass-subtle)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <Sparkles
                    className="w-4 h-4"
                    style={{ color: 'var(--accent-primary)' }}
                  />
                  <span>Show Welcome Note</span>
                </button>
              </div>
            </div>

            {/* Signed-in Member & Sign Out */}
            <div
              className="pt-4 border-t space-y-3"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="px-1 space-y-0.5">
                <div
                  className="text-xs font-semibold truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {user.name}
                </div>
                <div
                  className="text-[11px] truncate"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {user.email}
                </div>
              </div>

              <button
                type="button"
                onClick={onSignOut}
                className="glass-input w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out to Garden</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
