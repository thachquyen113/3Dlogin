import {
  BookOpen,
  Compass,
  Lamp,
  Library,
  LogOut,
  Menu,
  MessageCircle,
  Monitor,
  Moon,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type {
  AuthenticatedUser,
  CameraPreset,
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
  onSelectCamera: (preset: OfficeCameraPreset) => void;
  lampsOn: boolean;
  onToggleLamps: () => void;
  onOpenScholarChat: () => void;
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
  onSelectCamera,
  lampsOn,
  onToggleLamps,
  onOpenScholarChat,
  onReopenWelcome,
  onSignOut,
}: OfficeSidebarProps) {
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
                    const active = cameraPreset === item.id;
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
