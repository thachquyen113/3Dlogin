/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SanctuaryScene } from './components/scene/SanctuaryScene';
import { ThemeToggle } from './components/ThemeToggle';
import { LoginCard } from './components/LoginCard';
import { SceneDock } from './components/SceneDock';
import { isSoftwareGl } from './utils/webgl';
import type { CameraPreset, SceneControlState, ThemeMode } from './types';

export default function App() {
  const [sceneState, setSceneState] = useState<SceneControlState>({
    theme: 'light',
    themeBurstId: 0,
    lastTriggeredTheme: null,
    cameraPreset: 'split',
    breezeIntensity: 1.0,
    skySpeed: 1.0,
    zenMode: false,
  });

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
    setSceneState((prev) => ({
      ...prev,
      cameraPreset,
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

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Full-Bleed 3D React Three Fiber Canvas */}
      <SanctuaryScene state={sceneState} />

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

      {/* Semantic Foreground UI Overlay */}
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
                    onTriggerCelestialEffect={handleTriggerCelestialEffect}
                    onSelectCameraPreset={handleSelectCamera}
                    breezeIntensity={sceneState.breezeIntensity}
                    onChangeBreeze={handleChangeBreeze}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Collapsible Unified Scene Control Dock at Bottom Center */}
      <SceneDock
        state={sceneState}
        onChangeCamera={handleSelectCamera}
        onChangeBreeze={handleChangeBreeze}
        onChangeSkySpeed={handleChangeSkySpeed}
        onTriggerCelestialEvent={handleTriggerCelestialEffect}
        onToggleZenMode={handleToggleZenMode}
      />
    </div>
  );
}
