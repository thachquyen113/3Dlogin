/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SanctuaryScene } from './components/scene/SanctuaryScene';
import { ThemeToggle } from './components/ThemeToggle';
import { LoginCard } from './components/LoginCard';
import { SceneDock } from './components/SceneDock';
import { BotanicalCursor } from './components/BotanicalCursor';
import { WelcomeModal } from './components/WelcomeModal';
import { OfficeSidebar } from './components/OfficeSidebar';
import { StudyHoverTooltip } from './components/StudyHoverTooltip';
import { ScholarTalkLabel } from './components/ScholarTalkLabel';
import { ScholarChatModal } from './components/ScholarChatModal';
import { SupportHandoverModal } from './components/SupportHandoverModal';
import { FeaturedBookOverlay } from './components/FeaturedBookOverlay';
import { BookshelfBookListModal } from './components/BookshelfBookListModal';
import type { HerbariumBookItem } from './data/herbariumBooksData';
import {
  computeFeaturedBookCameraFocus,
  getSortedFeaturedBooks,
  type FeaturedBookEntry,
} from './data/booksData';
import { isSoftwareGl } from './utils/webgl';
import type {
  AuthenticatedUser,
  BookShelfSortMode,
  CameraPreset,
  CustomCameraFocus,
  FeaturedBookId,
  HoveredStudyItem,
  OfficeCameraPreset,
  SceneControlState,
  ThemeMode,
} from './types';

export default function App() {
  const [sceneState, setSceneState] = useState<SceneControlState>({
    theme: 'light',
    themeBurstId: 0,
    lastTriggeredTheme: null,
    cameraPreset: 'split',
    breezeIntensity: 1.0,
    skySpeed: 1.0,
    zenMode: false,
    isAuthenticated: false,
    officeLampsOn: true,
  });

  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser>({
    name: 'Claire Linnea',
    email: 'claire.botanist@sylva.garden',
  });
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scholarChatOpen, setScholarChatOpen] = useState(false);
  const [scholarChatFullScreen, setScholarChatFullScreen] = useState(false);
  const [scholarSpeaking, setScholarSpeaking] = useState(false);
  const [supportHandoverOpen, setSupportHandoverOpen] = useState(false);
  const [supportHandoverTopic, setSupportHandoverTopic] = useState('');
  const [bookshelfModalOpen, setBookshelfModalOpen] = useState(false);
  const [scholarPointerEngaged, setScholarPointerEngaged] = useState(false);
  const [scholarLabelEngaged, setScholarLabelEngaged] = useState(false);
  const [shelfSortMode, setShelfSortMode] =
    useState<BookShelfSortMode>('curated');
  const [selectedBookId, setSelectedBookId] =
    useState<FeaturedBookId | null>(null);
  const [customCameraFocus, setCustomCameraFocus] =
    useState<CustomCameraFocus | null>(null);
  const [queuedScholarPrompt, setQueuedScholarPrompt] = useState<{
    id: number;
    text: string;
  } | null>(null);
  const [hoveredStudyItem, setHoveredStudyItem] =
    useState<HoveredStudyItem | null>(null);
  const tooltipDomRef = useRef<HTMLDivElement | null>(null);
  const scholarLabelDomRef = useRef<HTMLDivElement | null>(null);

  // Sync root classes for CSS variables & software-GL optimization
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', sceneState.theme === 'dark');
    if (isSoftwareGl) {
      root.classList.add('software-gl');
    }
  }, [sceneState.theme]);

  const handleSelectTheme = useCallback((mode: ThemeMode) => {
    setSceneState((prev) => ({
      ...prev,
      theme: mode,
      themeBurstId: prev.themeBurstId + 1,
      lastTriggeredTheme: mode,
    }));
  }, []);

  const handleTriggerCelestialEffect = useCallback(() => {
    setSceneState((prev) => ({
      ...prev,
      themeBurstId: prev.themeBurstId + 1,
      lastTriggeredTheme: prev.theme,
    }));
  }, []);

  const handleSelectCamera = useCallback((cameraPreset: CameraPreset) => {
    setSelectedBookId(null);
    setCustomCameraFocus(null);
    setSceneState((prev) => ({
      ...prev,
      cameraPreset,
    }));
  }, []);

  const handleSelectOfficeCamera = useCallback((cameraPreset: OfficeCameraPreset) => {
    setSelectedBookId(null);
    setCustomCameraFocus(null);
    setSceneState((prev) => ({
      ...prev,
      cameraPreset,
    }));
  }, []);

  const handleChangeShelfSortMode = useCallback(
    (nextMode: BookShelfSortMode) => {
      setShelfSortMode(nextMode);
      setSelectedBookId((currentBookId) => {
        if (currentBookId) {
          const sorted = getSortedFeaturedBooks(nextMode);
          const nextIdx = sorted.findIndex((b) => b.id === currentBookId);
          if (nextIdx >= 0) {
            setCustomCameraFocus(computeFeaturedBookCameraFocus(nextIdx));
          }
        }
        return currentBookId;
      });
    },
    [],
  );

  const handleSelectFeaturedBook = useCallback(
    (bookId: FeaturedBookId, focus: CustomCameraFocus) => {
      setShowWelcomeModal(false);
      setSidebarOpen(false);
      setScholarChatOpen(false);
      setScholarChatFullScreen(false);
      setScholarSpeaking(false);
      setHoveredStudyItem(null);
      setSelectedBookId(bookId);
      setCustomCameraFocus(focus);
      setSceneState((prev) => ({
        ...prev,
        cameraPreset: 'office-books',
      }));
    },
    [],
  );

  const handleClearSelectedBook = useCallback(() => {
    setSelectedBookId(null);
    setCustomCameraFocus(null);
    setSceneState((prev) => ({
      ...prev,
      cameraPreset: 'office-books',
    }));
  }, []);

  const handleChangeBreeze = useCallback((breezeIntensity: number) => {
    setSceneState((prev) => ({
      ...prev,
      breezeIntensity,
    }));
  }, []);

  const handleChangeSkySpeed = useCallback((skySpeed: number) => {
    setSceneState((prev) => ({
      ...prev,
      skySpeed,
    }));
  }, []);

  const handleToggleZenMode = useCallback(() => {
    setSceneState((prev) => ({
      ...prev,
      zenMode: !prev.zenMode,
    }));
  }, []);

  const handleToggleOfficeLamps = useCallback(() => {
    setSceneState((prev) => ({
      ...prev,
      officeLampsOn: !prev.officeLampsOn,
    }));
  }, []);

  const handleOpenScholarChat = useCallback(() => {
    setShowWelcomeModal(false);
    setSidebarOpen(false);
    setHoveredStudyItem(null);
    setSelectedBookId(null);
    setCustomCameraFocus(null);
    setScholarChatOpen(true);
    setSceneState((prev) => ({
      ...prev,
      cameraPreset: 'office-sofa',
    }));
  }, []);

  const handleOpenSupportHandover = useCallback((topic?: string) => {
    setShowWelcomeModal(false);
    setSidebarOpen(false);
    setHoveredStudyItem(null);
    setSupportHandoverTopic(topic || 'Study Session Support');
    setSupportHandoverOpen(true);
  }, []);

  const handleAskScholarAboutBook = useCallback((book: FeaturedBookEntry) => {
    setShowWelcomeModal(false);
    setSidebarOpen(false);
    setHoveredStudyItem(null);
    setSelectedBookId(null);
    setCustomCameraFocus(null);
    setScholarChatOpen(true);
    setQueuedScholarPrompt({
      id: Date.now(),
      text: `What are your thoughts on "${book.title}" on your bookshelf?`,
    });
    setSceneState((prev) => ({
      ...prev,
      cameraPreset: 'office-sofa',
    }));
  }, []);

  const handleOpenChatForBook = useCallback((bookTitle: string) => {
    setShowWelcomeModal(false);
    setSidebarOpen(false);
    setHoveredStudyItem(null);
    setSelectedBookId(null);
    setCustomCameraFocus(null);
    setScholarChatOpen(true);
    setQueuedScholarPrompt({
      id: Date.now(),
      text: `What are your thoughts on "${bookTitle}" on your bookshelf?`,
    });
    setSceneState((prev) => ({
      ...prev,
      cameraPreset: 'office-sofa',
    }));
  }, []);

  const handleConsumeQueuedPrompt = useCallback((id: number) => {
    setQueuedScholarPrompt((prev) => (prev?.id === id ? null : prev));
  }, []);

  const handleOpenBookListModal = useCallback(() => {
    setBookshelfModalOpen(true);
  }, []);

  const handleFocusHerbariumBookIn3D = useCallback((book: HerbariumBookItem) => {
    setBookshelfModalOpen(false);
    setSelectedBookId(null);
    // Shelf Y heights: [0.22, 0.78, 1.34, 1.90], shelf slot X relative to case center (-4.25)
    const bookY = 0.22 + book.tierIndex * 0.56 + 0.16;
    const bookX = -4.25 + book.shelfSlotX;
    setCustomCameraFocus({
      cameraPos: { x: bookX + 0.22, y: bookY + 0.08, z: -2.15 },
      targetPos: { x: bookX, y: bookY, z: -3.52 },
    });
  }, []);

  const handleAskScholarAboutHerbariumBook = useCallback((book: HerbariumBookItem) => {
    setBookshelfModalOpen(false);
    setQueuedScholarPrompt({
      id: Date.now(),
      text: `Professor Linnea, could you provide your scholarly commentary on "${book.title}" by ${book.author} (${book.edition}) from the North Herbarium Case?`,
    });
    setScholarChatOpen(true);
    setScholarChatFullScreen(false);
    setSceneState((prev) => ({
      ...prev,
      cameraPreset: 'office-sofa',
    }));
  }, []);

  const handleAuthenticated = useCallback((user: AuthenticatedUser) => {
    setAuthenticatedUser(user);
    setSidebarOpen(false);
    setScholarChatOpen(false);
    setScholarChatFullScreen(false);
    setScholarSpeaking(false);
    setSupportHandoverOpen(false);
    setBookshelfModalOpen(false);
    setScholarPointerEngaged(false);
    setScholarLabelEngaged(false);
    setSelectedBookId(null);
    setCustomCameraFocus(null);
    setSceneState((prev) => ({
      ...prev,
      isAuthenticated: true,
      cameraPreset: 'office-overview',
      zenMode: false,
      themeBurstId: prev.themeBurstId + 1,
      lastTriggeredTheme: prev.theme,
    }));
    // 1. First show the welcome modal animation immediately upon entering the 3D office
    setShowWelcomeModal(true);
  }, []);

  const handleSignOut = useCallback(() => {
    setShowWelcomeModal(false);
    setSidebarOpen(false);
    setScholarChatOpen(false);
    setScholarChatFullScreen(false);
    setScholarSpeaking(false);
    setSupportHandoverOpen(false);
    setBookshelfModalOpen(false);
    setScholarPointerEngaged(false);
    setScholarLabelEngaged(false);
    setSelectedBookId(null);
    setCustomCameraFocus(null);
    setHoveredStudyItem(null);
    setSceneState((prev) => ({
      ...prev,
      isAuthenticated: false,
      cameraPreset: 'split',
    }));
  }, []);

  const isCameraFocusedOnScholar =
    sceneState.cameraPreset === 'office-sofa' && !selectedBookId;
  const showScholarTalkLabel =
    !showWelcomeModal &&
    !hoveredStudyItem &&
    !selectedBookId &&
    !(scholarChatOpen && scholarChatFullScreen) &&
    (scholarPointerEngaged ||
      scholarLabelEngaged ||
      isCameraFocusedOnScholar ||
      scholarChatOpen);

  const showBookshelfSortBar =
    !showWelcomeModal &&
    !scholarChatOpen &&
    (sceneState.cameraPreset === 'office-books' || Boolean(selectedBookId));

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Full-Bleed 3D React Three Fiber Canvas (Garden Login <-> Post-Login 3D Office Study) */}
      <SanctuaryScene
        state={sceneState}
        shelfSortMode={shelfSortMode}
        selectedBookId={selectedBookId}
        customCameraFocus={customCameraFocus}
        isConversing={scholarChatOpen}
        isScholarSpeaking={scholarSpeaking}
        scholarExternalEngaged={scholarLabelEngaged || isCameraFocusedOnScholar}
        scholarLabelDomRef={scholarLabelDomRef}
        onScholarPointerChange={setScholarPointerEngaged}
        onHoverStudyItem={setHoveredStudyItem}
        tooltipDomRef={tooltipDomRef}
        onSelectOfficeView={handleSelectOfficeCamera}
        onSelectFeaturedBook={handleSelectFeaturedBook}
        onOpenScholarChat={handleOpenScholarChat}
        onOpenSupportHandover={handleOpenSupportHandover}
        openChatUI={handleOpenChatForBook}
        onOpenBookListModal={handleOpenBookListModal}
      />

      {/* Smooth CSS-Variable Ambient Sunshine & Nocturnal Starlight Washes */}
      <div
        aria-hidden="true"
        className="sunshine-ambient-overlay fixed inset-0 pointer-events-none z-[1]"
      />
      <div
        aria-hidden="true"
        className="night-ambient-overlay fixed inset-0 pointer-events-none z-[1]"
      />

      {/* Interactive Celestial Transition Burst when pressing Light or Dark button */}
      {sceneState.themeBurstId > 0 && sceneState.lastTriggeredTheme === 'light' && (
        <div
          key={`sun-${sceneState.themeBurstId}`}
          aria-hidden="true"
          className="animate-sunflare-burst fixed inset-0 pointer-events-none z-[2]"
          style={{
            background:
              'radial-gradient(circle at 20% 15%, rgba(254, 240, 138, 0.52) 0%, rgba(251, 191, 36, 0.16) 32%, transparent 66%)',
          }}
        />
      )}

      {sceneState.themeBurstId > 0 && sceneState.lastTriggeredTheme === 'dark' && (
        <div
          key={`night-${sceneState.themeBurstId}`}
          aria-hidden="true"
          className="animate-starlight-burst fixed inset-0 pointer-events-none z-[2]"
          style={{
            background:
              'radial-gradient(circle at 28% 18%, rgba(147, 197, 253, 0.34) 0%, rgba(56, 189, 248, 0.1) 36%, transparent 70%)',
          }}
        />
      )}

      {sceneState.isAuthenticated ? (
        /* ==================== POST-LOGIN 3D OFFICE STUDY OVERLAY ==================== */
        <>
          {/* Top-Left Sidebar Menu Icon & Transparent Left Sidebar over 3D Background */}
          <OfficeSidebar
            open={sidebarOpen}
            onToggleOpen={() => setSidebarOpen((prev) => !prev)}
            onClose={() => setSidebarOpen(false)}
            user={authenticatedUser}
            theme={sceneState.theme}
            onSelectTheme={handleSelectTheme}
            cameraPreset={sceneState.cameraPreset}
            shelfSortMode={shelfSortMode}
            selectedBookId={selectedBookId}
            onSelectCamera={handleSelectOfficeCamera}
            onChangeSortMode={handleChangeShelfSortMode}
            onSelectFeaturedBook={handleSelectFeaturedBook}
            lampsOn={sceneState.officeLampsOn}
            onToggleLamps={handleToggleOfficeLamps}
            onOpenScholarChat={handleOpenScholarChat}
            onOpenSupportHandover={handleOpenSupportHandover}
            onOpenBookListModal={handleOpenBookListModal}
            onReopenWelcome={() => {
              setSidebarOpen(false);
              setScholarChatOpen(false);
              setSelectedBookId(null);
              setCustomCameraFocus(null);
              setShowWelcomeModal(true);
            }}
            onSignOut={handleSignOut}
          />

          {/* Top-Right Theme Switcher preserved in Post-Login Office */}
          <div className="fixed top-5 right-6 z-30 pointer-events-auto flex items-center gap-2">
            {/* Quick Call Support HandOver pill button */}
            <button
              type="button"
              onClick={() => handleOpenSupportHandover('Direct Call from Top Bar')}
              className="theme-toggle-shell h-11 px-3.5 rounded-2xl flex items-center gap-2 text-xs font-semibold cursor-pointer pointer-events-auto backdrop-blur-md transition-colors border hover:border-emerald-500/50"
              style={{
                color: 'var(--text-primary)',
              }}
              title="Call Human Support"
              aria-label="Call Human Support"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">Call Support</span>
            </button>
            <ThemeToggle theme={sceneState.theme} onSelectTheme={handleSelectTheme} />
          </div>

          {/* Floating 3D-Projected Hover Tooltip for Bookshelf Volumes, Computer Screen & Curator Telephone */}
          <StudyHoverTooltip
            item={showWelcomeModal ? null : hoveredStudyItem}
            anchorRef={tooltipDomRef}
          />

          {/* Interactive Bookshelf Sort Strip & Transparent Featured Book Inspector */}
          <FeaturedBookOverlay
            visibleBar={showBookshelfSortBar}
            sortMode={shelfSortMode}
            selectedBookId={selectedBookId}
            onChangeSortMode={handleChangeShelfSortMode}
            onSelectBook={handleSelectFeaturedBook}
            onClearSelectedBook={handleClearSelectedBook}
            onAskScholarAboutBook={handleAskScholarAboutBook}
          />

          {/* Floating 3D-Projected Talking Icon Label on Hover / Move / Focus over the Reading Scholar */}
          <ScholarTalkLabel
            active={showScholarTalkLabel}
            highlighted={scholarPointerEngaged || scholarLabelEngaged}
            isConversing={scholarChatOpen}
            isScholarSpeaking={scholarSpeaking}
            anchorRef={scholarLabelDomRef}
            onOpenChat={handleOpenScholarChat}
            onLabelEngageChange={setScholarLabelEngaged}
          />

          {/* Transparent Conversation Modal with Professor Arthur Linnea */}
          <ScholarChatModal
            open={scholarChatOpen && !showWelcomeModal}
            onClose={() => {
              setScholarChatOpen(false);
              setScholarChatFullScreen(false);
              setScholarSpeaking(false);
            }}
            user={authenticatedUser}
            theme={sceneState.theme}
            onScholarSpeakingChange={setScholarSpeaking}
            onOpenSupportHandover={handleOpenSupportHandover}
            isFullScreen={scholarChatFullScreen}
            onFullScreenChange={setScholarChatFullScreen}
            queuedPrompt={queuedScholarPrompt}
            onConsumeQueuedPrompt={handleConsumeQueuedPrompt}
          />

          {/* HandOver: Real Voice Call with Human Support Specialists */}
          <SupportHandoverModal
            open={supportHandoverOpen && !showWelcomeModal}
            onClose={() => setSupportHandoverOpen(false)}
            user={authenticatedUser}
            theme={sceneState.theme}
            cameraPreset={sceneState.cameraPreset}
            initialTopic={supportHandoverTopic}
            sourceContext={scholarChatOpen ? 'scholar-modal' : 'general'}
          />

          {/* 1. Animated Welcome Modal shown first after login */}
          <WelcomeModal
            open={showWelcomeModal}
            user={authenticatedUser}
            theme={sceneState.theme}
            onClose={() => setShowWelcomeModal(false)}
            onSelectOfficeView={handleSelectOfficeCamera}
            onOpenSidebar={() => setSidebarOpen(true)}
          />

          {/* North Herbarium Bookshelf Catalog & Interactive Study Note Modal */}
          <BookshelfBookListModal
            open={bookshelfModalOpen && !showWelcomeModal}
            onClose={() => setBookshelfModalOpen(false)}
            theme={sceneState.theme}
            onFocusBookIn3D={handleFocusHerbariumBookIn3D}
            onAskScholarAboutBook={handleAskScholarAboutHerbariumBook}
          />
        </>
      ) : (
        /* ==================== PRE-LOGIN 3D BOTANICAL GARDEN OVERLAY ==================== */
        <div className="relative z-10 w-full h-full flex flex-col justify-between pointer-events-none">
          {/* 3-Zone Top Bar */}
          <header className="w-full max-w-[1440px] mx-auto px-6 sm:px-10 pt-5 pb-3 flex items-center justify-between gap-8 pointer-events-auto">
            {/* Zone 1: Single-line Brand Wordmark */}
            <a
              href="#sanctuary"
              onClick={(e) => {
                e.preventDefault();
                handleSelectCamera('split');
              }}
              className="font-display text-xl font-semibold tracking-tight whitespace-nowrap shrink-0 transition-colors duration-500"
              style={{ color: 'var(--text-primary)' }}
            >
              Sylva Sanctuary
            </a>

            {/* Zone 2: Clean Single-Line Text Navigation Links */}
            <nav
              aria-label="Sanctuary viewpoints"
              className="hidden md:flex items-center gap-7 text-sm font-medium"
            >
              {(
                [
                  { id: 'split', label: 'Overview' },
                  { id: 'garden', label: 'Meadow' },
                  { id: 'pond', label: 'Lotus Pond' },
                  { id: 'sky', label: 'Sky Dome' },
                ] as const
              ).map((item) => {
                const active = sceneState.cameraPreset === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectCamera(item.id)}
                    className="relative py-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-200 hover:underline underline-offset-4"
                    style={{
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Zone 3: Primary Theme Action (Light Sunshine / Dark Starry Sky) */}
            <div className="shrink-0">
              <ThemeToggle theme={sceneState.theme} onSelectTheme={handleSelectTheme} />
            </div>
          </header>

          {/* Main Split Viewport Content */}
          <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 sm:px-10 pb-20 grid grid-cols-1 lg:grid-cols-12 items-center gap-8">
            {/* Left Side: Open Unobstructed View of the 3D Living Botanical Garden */}
            <div className="hidden lg:flex lg:col-span-7 h-full flex-col justify-end pb-6">
              <div
                className="max-w-md space-y-2 p-4 rounded-2xl transition-colors duration-500"
                style={{
                  background:
                    sceneState.theme === 'light'
                      ? 'linear-gradient(90deg, rgba(255,253,248,0.58) 0%, rgba(255,253,248,0) 100%)'
                      : 'linear-gradient(90deg, rgba(7,12,26,0.56) 0%, rgba(7,12,26,0) 100%)',
                }}
              >
                <p
                  className="font-display text-2xl font-semibold tracking-tight leading-snug"
                  style={{ color: 'var(--text-primary)', textWrap: 'balance' }}
                >
                  {sceneState.theme === 'light'
                    ? 'Drifting clouds and soaring birds cross the sunlit sky above the blossoming grove.'
                    : 'Radiant star shine and luminous comets sweep across the moonlit sanctuary sky.'}
                </p>
                <div
                  className="flex items-center gap-2 text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span>Living 3D Conservatory</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {sceneState.theme === 'light'
                      ? 'Clouds & Sky Flock Active'
                      : 'Star Shine & Comets Active'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Side: Blurred Transparent Login Card */}
            <div className="col-span-1 lg:col-span-5 flex items-center justify-center lg:justify-end">
              <AnimatePresence>
                {!sceneState.zenMode && (
                  <motion.div
                    initial={{ opacity: 0, x: 24, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 28, scale: 0.97 }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full flex justify-center lg:justify-end"
                  >
                    <LoginCard
                      theme={sceneState.theme}
                      onAuthenticated={handleAuthenticated}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>
        </div>
      )}

      {/* Collapsible Unified Scene Control Dock at Bottom Center */}
      <SceneDock
        state={sceneState}
        onChangeCamera={handleSelectCamera}
        onChangeBreeze={handleChangeBreeze}
        onChangeSkySpeed={handleChangeSkySpeed}
        onTriggerCelestialEvent={handleTriggerCelestialEffect}
        onToggleZenMode={handleToggleZenMode}
        onToggleOfficeLamps={handleToggleOfficeLamps}
      />

      {/* Custom Framer Motion Botanical Cursor & Subtle Particle Trail */}
      <BotanicalCursor
        theme={sceneState.theme}
        externalInteractive={Boolean(
          (hoveredStudyItem || scholarPointerEngaged || scholarLabelEngaged) &&
            !showWelcomeModal,
        )}
      />
    </div>
  );
}
