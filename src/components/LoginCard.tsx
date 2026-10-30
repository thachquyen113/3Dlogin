import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Sparkles,
  Sun,
  User,
  Wind,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { AuthView, CameraPreset, ThemeMode } from '../types';

interface LoginCardProps {
  theme: ThemeMode;
  onTriggerCelestialEffect: () => void;
  onSelectCameraPreset: (preset: CameraPreset) => void;
  breezeIntensity: number;
  onChangeBreeze: (v: number) => void;
}

export function LoginCard({
  theme,
  onTriggerCelestialEffect,
  onSelectCameraPreset,
  breezeIntensity,
  onChangeBreeze,
}: LoginCardProps) {
  const [view, setView] = useState<AuthView>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('claire.botanist@sylva.garden');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  // Subtle interactive 3D card perspective tilt on pointer hover
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rx: -ny * 5.5,
      ry: nx * 6.5,
    });
  };

  const handlePointerLeave = () => {
    setTilt({ rx: 0, ry: 0 });
  };

  const switchView = (next: AuthView) => {
    setErrorMessage(null);
    setResetSent(false);
    setView(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (view === 'forgot') {
      setIsSubmitting(true);
      window.setTimeout(() => {
        setIsSubmitting(false);
        setResetSent(true);
      }, 450);
      return;
    }

    if (view === 'signup' && fullName.trim().length < 2) {
      setErrorMessage('Please enter your full name to create a pass.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    window.setTimeout(() => {
      setIsSubmitting(false);
      setView('authenticated');
      onTriggerCelestialEffect();
    }, 520);
  };

  const handleQuickSso = (provider: string) => {
    setErrorMessage(null);
    setFullName(`${provider} Member`);
    setIsSubmitting(true);
    window.setTimeout(() => {
      setIsSubmitting(false);
      setView('authenticated');
      onTriggerCelestialEffect();
    }, 420);
  };

  const passwordStrength = Math.min(
    100,
    Math.round(
      (password.length >= 8 ? 45 : 20) +
        (/[A-Z]/.test(password) ? 25 : 0) +
        (/[0-9•]/.test(password) ? 30 : 0),
    ),
  );

  return (
    <div
      className="w-full max-w-[432px] pointer-events-auto"
      style={{ perspective: '1200px' }}
    >
      <motion.div
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        animate={{
          rotateX: tilt.rx,
          rotateY: tilt.ry,
        }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="glass-card-surface relative rounded-3xl p-7 sm:p-8 overflow-hidden"
      >
        {/* Subtle top specular highlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent)',
          }}
        />

        <AnimatePresence mode="wait">
          {view === 'authenticated' ? (
            <motion.div
              key="authenticated"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <div
                  className="inline-flex items-center gap-2 text-xs font-medium"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sanctuary Session Active</span>
                </div>
                <h2
                  className="font-display text-2xl sm:text-3xl font-semibold tracking-tight"
                  style={{ color: 'var(--text-primary)', textWrap: 'balance' }}
                >
                  Welcome back, {fullName.trim() ? fullName.trim().split(' ')[0] : 'Claire'}
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Your botanical workspace is synchronized. Explore the living conservatory or tune
                  the atmosphere below.
                </p>
              </div>

              {/* Clean unboxed session metadata */}
              <div
                className="py-3 border-y text-xs flex flex-wrap items-center gap-x-2 gap-y-1"
                style={{
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                <span className="truncate max-w-[200px]">{email}</span>
                <span aria-hidden="true">·</span>
                <span>{theme === 'light' ? 'Sunlit Conservatory' : 'Starlit Conservatory'}</span>
              </div>

              {/* Interactive Sanctuary Controls */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <Wind className="w-3.5 h-3.5" />
                      Garden Breeze
                    </span>
                    <span className="font-mono-tabular" style={{ color: 'var(--text-primary)' }}>
                      {Math.round(breezeIntensity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={2.0}
                    step={0.1}
                    value={breezeIntensity}
                    onChange={(e) => onChangeBreeze(parseFloat(e.target.value))}
                    aria-label="Garden Breeze Intensity"
                    className="w-full accent-emerald-600 dark:accent-teal-400 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => onSelectCameraPreset('garden')}
                    className="glass-input px-3.5 py-2.5 rounded-xl text-xs font-medium text-center cursor-pointer hover:opacity-90 whitespace-nowrap"
                  >
                    Visit Blossom Meadow
                  </button>
                  <button
                    type="button"
                    onClick={onTriggerCelestialEffect}
                    className="glass-input px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90 whitespace-nowrap"
                  >
                    {theme === 'light' ? (
                      <>
                        <Sun className="w-3.5 h-3.5" />
                        Sunburst Pulse
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Summon Comet
                      </>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onSelectCameraPreset('split');
                  switchView('signin');
                }}
                className="btn-primary-theme w-full py-3 px-4 rounded-xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Sign Out</span>
              </button>
            </motion.div>
          ) : (
            <motion.form
              key={view}
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
              noValidate
            >
              {/* Header */}
              <div className="space-y-1.5">
                <p
                  className="text-xs font-medium"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {theme === 'light'
                    ? 'Morning Conservatory · Golden Hour'
                    : 'Nocturnal Conservatory · Starlit Sky'}
                </p>
                <h1
                  className="font-display text-2xl sm:text-[28px] font-semibold tracking-tight leading-tight"
                  style={{ color: 'var(--text-primary)', textWrap: 'balance' }}
                >
                  {view === 'signin' && 'Enter the Sanctuary'}
                  {view === 'signup' && 'Create Botanical Pass'}
                  {view === 'forgot' && 'Restore Your Access'}
                </h1>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {view === 'signin' &&
                    'Sign in to continue to your living 3D botanical studio and saved collections.'}
                  {view === 'signup' &&
                    'Join Sylva to curate seasonal gardens and synchronize lighting presets.'}
                  {view === 'forgot' &&
                    'Enter your account email and we will send a recovery link right away.'}
                </p>
              </div>

              {/* Segmented Mode Switcher (Sign In / Create Account) */}
              {view !== 'forgot' && (
                <div
                  className="grid grid-cols-2 p-1 rounded-xl"
                  style={{
                    backgroundColor: 'var(--bg-glass-subtle)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => switchView('signin')}
                    className="py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap"
                    style={{
                      backgroundColor:
                        view === 'signin' ? 'var(--bg-input-focus)' : 'transparent',
                      color:
                        view === 'signin' ? 'var(--text-primary)' : 'var(--text-muted)',
                      boxShadow:
                        view === 'signin' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => switchView('signup')}
                    className="py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap"
                    style={{
                      backgroundColor:
                        view === 'signup' ? 'var(--bg-input-focus)' : 'transparent',
                      color:
                        view === 'signup' ? 'var(--text-primary)' : 'var(--text-muted)',
                      boxShadow:
                        view === 'signup' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    Create Account
                  </button>
                </div>
              )}

              {/* Form Inputs */}
              <div className="space-y-3.5">
                {view === 'signup' && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="full-name"
                      className="block text-xs font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Full Name
                    </label>
                    <div className="relative">
                      <User
                        className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: 'var(--text-muted)' }}
                      />
                      <input
                        id="full-name"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Claire Linnea"
                        autoComplete="name"
                        className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label
                    htmlFor="email-input"
                    className="block text-xs font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: 'var(--text-muted)' }}
                    />
                    <input
                      id="email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@sylva.garden"
                      autoComplete="email"
                      className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                </div>

                {view !== 'forgot' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="password-input"
                        className="block text-xs font-medium"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Password
                      </label>
                      {view === 'signin' && (
                        <button
                          type="button"
                          onClick={() => switchView('forgot')}
                          className="text-xs font-medium hover:underline cursor-pointer"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock
                        className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: 'var(--text-muted)' }}
                      />
                      <input
                        id="password-input"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        autoComplete={view === 'signin' ? 'current-password' : 'new-password'}
                        className="glass-input w-full pl-10 pr-11 py-2.5 rounded-xl text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md cursor-pointer opacity-75 hover:opacity-100"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {view === 'signup' && (
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <span style={{ color: 'var(--text-muted)' }}>Key strength</span>
                        <span
                          className="font-mono-tabular font-medium"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {passwordStrength}%
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Error or Recovery Confirmation Banner (Accessible text + icon) */}
              {errorMessage && (
                <div
                  role="alert"
                  className="px-3.5 py-2.5 rounded-xl text-xs font-medium"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.14)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    color: theme === 'dark' ? '#fecaca' : '#991b1b',
                  }}
                >
                  {errorMessage}
                </div>
              )}

              {resetSent && (
                <div
                  role="status"
                  className="px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2"
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    color: theme === 'dark' ? '#a7f3d0' : '#065f46',
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Recovery instructions sent to {email}.</span>
                </div>
              )}

              {/* Remember Session */}
              {view === 'signin' && (
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-700 dark:accent-teal-400 cursor-pointer"
                  />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Keep me signed in for 30 days
                  </span>
                </label>
              )}

              {/* Primary Action CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary-theme w-full py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                <span>
                  {isSubmitting
                    ? 'Authenticating...'
                    : view === 'signin'
                      ? 'Sign In'
                      : view === 'signup'
                        ? 'Create Botanical Pass'
                        : 'Send Recovery Link'}
                </span>
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>

              {view === 'forgot' ? (
                <button
                  type="button"
                  onClick={() => switchView('signin')}
                  className="w-full py-2 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:underline"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              ) : (
                <>
                  {/* Divider */}
                  <div className="relative flex items-center py-1">
                    <div
                      className="flex-grow h-px"
                      style={{ backgroundColor: 'var(--border-subtle)' }}
                    />
                    <span
                      className="px-3 text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Or continue with
                    </span>
                    <div
                      className="flex-grow h-px"
                      style={{ backgroundColor: 'var(--border-subtle)' }}
                    />
                  </div>

                  {/* SSO Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleQuickSso('Google')}
                      className="glass-input py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 whitespace-nowrap"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#EA4335"
                          d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.3-2 3l3.2 2.5c1.9-1.7 3-4.3 3-7.4 0-.7-.1-1.4-.2-2H12z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 22c2.7 0 5-.9 6.7-2.4l-3.2-2.5c-.9.6-2.1 1-3.5 1-2.7 0-5-1.8-5.8-4.3H2.9v2.6C4.6 19.8 8 22 12 22z"
                        />
                        <path
                          fill="#4A90E2"
                          d="M6.2 13.8c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7.6H2.9C2.3 8.9 2 10.4 2 12s.3 3.1.9 4.4l3.3-2.6z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M12 5.9c1.5 0 2.8.5 3.9 1.5l2.9-2.9C17 2.9 14.7 2 12 2 8 2 4.6 4.2 2.9 7.6l3.3 2.6c.8-2.5 3.1-4.3 5.8-4.3z"
                        />
                      </svg>
                      <span>Google</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickSso('Passkey')}
                      className="glass-input py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 whitespace-nowrap"
                    >
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>Passkey</span>
                    </button>
                  </div>
                </>
              )}
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
