import { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CloudSun,
  Eye,
  EyeOff,
  Sparkles,
  Wind,
} from 'lucide-react';
import type { CameraPreset, SceneControlState } from '../types';

interface SceneDockProps {
  state: SceneControlState;
  onChangeCamera: (preset: CameraPreset) => void;
  onChangeBreeze: (value: number) => void;
  onChangeSkySpeed: (value: number) => void;
  onTriggerCelestialEvent: () => void;
  onToggleZenMode: () => void;
}

const CAMERA_OPTIONS: Array<{ id: CameraPreset; label: string }> = [
  { id: 'split', label: 'Sanctuary Split' },
  { id: 'garden', label: 'Flower Meadow' },
  { id: 'pond', label: 'Koi Pond' },
  { id: 'sky', label: 'Celestial Sky' },
];

export function SceneDock({
  state,
  onChangeCamera,
  onChangeBreeze,
  onChangeSkySpeed,
  onTriggerCelestialEvent,
  onToggleZenMode,
}: SceneDockProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === 'h' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        setCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center max-w-[94vw] pointer-events-auto">
      {/* Collapse / Expand Toggle Tab */}
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="glass-dock-surface px-3.5 py-1.5 rounded-t-xl border-b-0 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        style={{ color: 'var(--text-secondary)' }}
      >
        {collapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Show Scene Controls</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" />
            <span>Hide Controls</span>
          </>
        )}
      </button>

      {/* Collapsible Unified Horizontal Dock */}
      {!collapsed && (
        <div className="glass-dock-surface rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-center gap-4">
          {/* Camera Viewpoint Selector */}
          <div className="flex items-center gap-1">
            {CAMERA_OPTIONS.map((opt) => {
              const active = state.cameraPreset === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeCamera(opt.id)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0"
                  style={{
                    backgroundColor: active ? 'var(--accent-primary)' : 'transparent',
                    color: active ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div
            aria-hidden="true"
            className="hidden sm:block w-px h-5"
            style={{ backgroundColor: 'var(--border-subtle)' }}
          />

          {/* Breeze Slider */}
          <label className="hidden md:flex items-center gap-2 text-xs whitespace-nowrap">
            <Wind className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Breeze</span>
            <input
              type="range"
              min={0.2}
              max={2.0}
              step={0.1}
              value={state.breezeIntensity}
              onChange={(e) => onChangeBreeze(parseFloat(e.target.value))}
              className="w-20 accent-emerald-600 dark:accent-teal-400 cursor-pointer"
            />
          </label>

          {/* Sky Drift Speed (Clouds & Birds in Day / Star Shine & Comets in Night) */}
          <label className="hidden lg:flex items-center gap-2 text-xs whitespace-nowrap">
            <CloudSun className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Sky Drift</span>
            <input
              type="range"
              min={0.3}
              max={2.2}
              step={0.1}
              value={state.skySpeed}
              onChange={(e) => onChangeSkySpeed(parseFloat(e.target.value))}
              className="w-20 accent-emerald-600 dark:accent-teal-400 cursor-pointer"
            />
          </label>

          <div
            aria-hidden="true"
            className="hidden sm:block w-px h-5"
            style={{ backgroundColor: 'var(--border-subtle)' }}
          />

          {/* Trigger Comet (Dark) or Sunburst (Light) */}
          <button
            type="button"
            onClick={onTriggerCelestialEvent}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 hover:opacity-85"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{state.theme === 'dark' ? 'Launch Comet' : 'Sunburst'}</span>
          </button>

          {/* Zen Mode Toggle */}
          <button
            type="button"
            onClick={onToggleZenMode}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            style={{
              backgroundColor: state.zenMode ? 'var(--accent-primary)' : 'transparent',
              color: state.zenMode ? 'var(--text-on-accent)' : 'var(--text-secondary)',
            }}
          >
            {state.zenMode ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Show Login</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Zen View</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
