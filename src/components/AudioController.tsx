import { useEffect, useRef, useState } from 'react';
import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { NatureSoundscapeEngine } from '../utils/natureAudio';
import type { ThemeMode } from '../types';

interface AudioControllerProps {
  theme: ThemeMode;
  breezeIntensity: number;
  themeBurstId: number;
}

export function AudioController({
  theme,
  breezeIntensity,
  themeBurstId,
}: AudioControllerProps) {
  const engineRef = useRef<NatureSoundscapeEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.6);

  // Initialize engine instance once and clean up on unmount
  useEffect(() => {
    const engine = new NatureSoundscapeEngine();
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Dynamically crossfade soundscape when Light / Dark theme changes
  useEffect(() => {
    engineRef.current?.setTheme(theme);
  }, [theme]);

  // Dynamically modulate wind rustle intensity when Breeze slider changes
  useEffect(() => {
    engineRef.current?.setBreezeIntensity(breezeIntensity);
  }, [breezeIntensity]);

  // Subtle harmonic accent when celestial event triggers while audio is active
  useEffect(() => {
    if (themeBurstId > 0) {
      engineRef.current?.playCelestialAccent();
    }
  }, [themeBurstId]);

  const handleTogglePlay = async () => {
    if (!engineRef.current) return;
    const next = !isPlaying;
    if (next && volume === 0) {
      setVolume(0.55);
      engineRef.current.setVolume(0.55);
    } else {
      engineRef.current.setVolume(volume);
    }
    const active = await engineRef.current.setPlaying(next);
    setIsPlaying(active);
  };

  const handleVolumeChange = async (nextVol: number) => {
    setVolume(nextVol);
    if (!engineRef.current) return;
    engineRef.current.setVolume(nextVol);

    if (nextVol > 0 && !isPlaying) {
      const active = await engineRef.current.setPlaying(true);
      setIsPlaying(active);
    } else if (nextVol === 0 && isPlaying) {
      await engineRef.current.setPlaying(false);
      setIsPlaying(false);
    }
  };

  const soundProfileLabel = !isPlaying
    ? 'Sound Off'
    : theme === 'light'
      ? 'Birds & Wind'
      : 'Crickets & Wind';

  return (
    <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
      <button
        type="button"
        onClick={handleTogglePlay}
        aria-pressed={isPlaying}
        aria-label={isPlaying ? 'Mute nature soundscape' : 'Play nature soundscape'}
        className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors duration-200 whitespace-nowrap shrink-0"
        style={{
          backgroundColor: isPlaying ? 'var(--accent-primary)' : 'transparent',
          color: isPlaying ? 'var(--text-on-accent)' : 'var(--text-secondary)',
        }}
      >
        {!isPlaying || volume === 0 ? (
          <VolumeX className="w-3.5 h-3.5 shrink-0" />
        ) : volume < 0.5 ? (
          <Volume1 className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <Volume2 className="w-3.5 h-3.5 shrink-0" />
        )}
        <span>{soundProfileLabel}</span>
      </button>

      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={isPlaying ? volume : 0}
        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
        aria-label="Ambient nature volume"
        className="hidden sm:block w-16 accent-emerald-600 dark:accent-teal-400 cursor-pointer"
      />
    </div>
  );
}
