import { useEffect } from 'react';
import { ArrowRight, BookOpen, LampDesk, Monitor, PanelLeft, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { AuthenticatedUser, OfficeCameraPreset, ThemeMode } from '../types';

interface WelcomeModalProps {
  open: boolean;
  user: AuthenticatedUser;
  theme: ThemeMode;
  onClose: () => void;
  onSelectOfficeView: (preset: OfficeCameraPreset) => void;
  onOpenSidebar: () => void;
}

export function WelcomeModal({
  open,
  user,
  theme,
  onClose,
  onSelectOfficeView,
  onOpenSidebar,
}: WelcomeModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const firstName = user.name.trim() ? user.name.trim().split(' ')[0] : 'Claire';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="welcome-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-5 pointer-events-auto"
          style={{
            backgroundColor:
              theme === 'dark' ? 'rgba(4, 9, 22, 0.42)' : 'rgba(18, 38, 32, 0.22)',
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-study-title"
            initial={{ opacity: 0, scale: 0.92, y: 22 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 14 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card-surface relative w-full max-w-[490px] rounded-3xl p-7 sm:p-8 overflow-hidden"
          >
            {/* Top specular sheen */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-10 top-0 h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
              }}
            />

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close welcome dialog"
              className="absolute top-5 right-5 p-2 rounded-xl cursor-pointer transition-opacity opacity-75 hover:opacity-100"
              style={{
                backgroundColor: 'var(--bg-glass-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-5">
              {/* Animated Greeting Header */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-2 pr-8"
              >
                <p
                  className="text-xs font-medium"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  {theme === 'light'
                    ? 'Private Study · Sunlit Conservatory View'
                    : 'Private Study · Nocturnal Starlit View'}
                </p>
                <h2
                  id="welcome-study-title"
                  className="font-display text-2xl sm:text-3xl font-semibold tracking-tight leading-tight"
                  style={{ color: 'var(--text-primary)', textWrap: 'balance' }}
                >
                  Welcome inside, {firstName}
                </h2>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Step into the quiet 3D library study. Take a seat near the reading sofa,
                  browse the walnut bookshelves, or focus at the computer desk. Use the
                  top-left menu icon anytime to open the transparent navigation drawer.
                </p>
              </motion.div>

              {/* Interactive Room Highlights */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectOfficeView('office-sofa');
                    onClose();
                  }}
                  className="glass-input p-3.5 rounded-2xl text-left space-y-1.5 cursor-pointer hover:opacity-90"
                >
                  <BookOpen
                    className="w-4 h-4"
                    style={{ color: 'var(--accent-primary)' }}
                  />
                  <div
                    className="text-xs font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Reading Sofa
                  </div>
                  <p className="text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                    Scholar reading beside a sleeping orange cat
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectOfficeView('office-desk');
                    onClose();
                  }}
                  className="glass-input p-3.5 rounded-2xl text-left space-y-1.5 cursor-pointer hover:opacity-90"
                >
                  <Monitor
                    className="w-4 h-4"
                    style={{ color: 'var(--accent-primary)' }}
                  />
                  <div
                    className="text-xs font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Computer Desk
                  </div>
                  <p className="text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                    Walnut workstation & studio display
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectOfficeView('office-books');
                    onClose();
                  }}
                  className="glass-input p-3.5 rounded-2xl text-left space-y-1.5 cursor-pointer hover:opacity-90"
                >
                  <LampDesk
                    className="w-4 h-4"
                    style={{ color: 'var(--accent-primary)' }}
                  />
                  <div
                    className="text-xs font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Bookshelves
                  </div>
                  <p className="text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                    Curated volumes around the study
                  </p>
                </button>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col sm:flex-row items-center gap-3 pt-1"
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-primary-theme w-full sm:flex-1 py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <span>Explore 3D Study</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSidebar();
                  }}
                  className="glass-input w-full sm:w-auto py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap hover:opacity-90"
                >
                  <PanelLeft className="w-4 h-4" />
                  <span>Open Left Menu</span>
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
