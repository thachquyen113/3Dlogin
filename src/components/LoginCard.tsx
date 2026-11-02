import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { AuthenticatedUser, AuthView, ThemeMode } from '../types';

interface LoginCardProps {
  theme: ThemeMode;
  onAuthenticated: (user: AuthenticatedUser) => void;
}

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  form?: string;
}

interface TouchedFields {
  fullName: boolean;
  email: boolean;
  password: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateFullName(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Full name is required.';
  }
  if (trimmed.length < 2) {
    return 'Enter at least 2 characters for your name.';
  }
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(trimmed)) {
    return 'Name can only contain letters, spaces, and hyphens.';
  }
  return undefined;
}

function validateEmail(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Email address is required.';
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Enter a valid email address (for example, name@sylva.garden).';
  }
  return undefined;
}

function validatePassword(value: string): string | undefined {
  if (!value) {
    return 'Password is required.';
  }
  if (value.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Za-z]/.test(value)) {
    return 'Include at least one letter in your password.';
  }
  if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)) {
    return 'Include at least one number or symbol.';
  }
  return undefined;
}

export function LoginCard({
  theme,
  onAuthenticated,
}: LoginCardProps) {
  const prefersReducedMotion = useReducedMotion();

  const [view, setView] = useState<AuthView>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({
    fullName: false,
    email: false,
    password: false,
  });

  // Incrementing key triggers damped shake animation on validation failure
  const [shakeCount, setShakeCount] = useState(0);
  const [cardErrorHighlight, setCardErrorHighlight] = useState(false);

  // Subtle interactive 3D card perspective tilt on pointer hover
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  useEffect(() => {
    if (!cardErrorHighlight) return;
    const timer = window.setTimeout(() => {
      setCardErrorHighlight(false);
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [cardErrorHighlight, shakeCount]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rx: -ny * 5.0,
      ry: nx * 6.0,
    });
  };

  const handlePointerLeave = () => {
    setTilt({ rx: 0, ry: 0 });
  };

  const switchView = (next: AuthView) => {
    setErrors({});
    setTouched({ fullName: false, email: false, password: false });
    setCardErrorHighlight(false);
    setResetSent(false);
    setView(next);
  };

  const triggerValidationShake = (nextErrors: FieldErrors) => {
    setErrors(nextErrors);
    setShakeCount((prev) => prev + 1);
    setCardErrorHighlight(true);
  };

  const handleFullNameChange = (value: string) => {
    setFullName(value);
    if (touched.fullName || errors.fullName) {
      setErrors((prev) => ({
        ...prev,
        fullName: validateFullName(value),
        form: undefined,
      }));
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setResetSent(false);
    if (touched.email || errors.email) {
      setErrors((prev) => ({
        ...prev,
        email: validateEmail(value),
        form: undefined,
      }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (touched.password || errors.password) {
      setErrors((prev) => ({
        ...prev,
        password: validatePassword(value),
        form: undefined,
      }));
    }
  };

  const handleBlurField = (field: keyof TouchedFields) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'fullName' && view === 'signup') {
      setErrors((prev) => ({ ...prev, fullName: validateFullName(fullName) }));
    } else if (field === 'email') {
      setErrors((prev) => ({ ...prev, email: validateEmail(email) }));
    } else if (field === 'password' && view !== 'forgot') {
      setErrors((prev) => ({ ...prev, password: validatePassword(password) }));
    }
  };

  const handleFillDemoPass = () => {
    if (view === 'signup' && !fullName.trim()) {
      setFullName('Claire Linnea');
    }
    setEmail('claire.botanist@sylva.garden');
    setPassword('SylvaGarden8!');
    setTouched({
      fullName: view === 'signup',
      email: true,
      password: view !== 'forgot',
    });
    setErrors({});
    setCardErrorHighlight(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetSent(false);

    const nextErrors: FieldErrors = {};

    const emailErr = validateEmail(email);
    if (emailErr) nextErrors.email = emailErr;

    if (view === 'signup') {
      const nameErr = validateFullName(fullName);
      if (nameErr) nextErrors.fullName = nameErr;
    }

    if (view !== 'forgot') {
      const passErr = validatePassword(password);
      if (passErr) nextErrors.password = passErr;
    }

    setTouched({
      fullName: view === 'signup',
      email: true,
      password: view !== 'forgot',
    });

    if (Object.keys(nextErrors).length > 0) {
      nextErrors.form =
        view === 'forgot'
          ? 'Please provide a valid account email before continuing.'
          : 'Please resolve the highlighted credential requirements.';
      triggerValidationShake(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    if (view === 'forgot') {
      window.setTimeout(() => {
        setIsSubmitting(false);
        setResetSent(true);
      }, 450);
      return;
    }

    window.setTimeout(() => {
      setIsSubmitting(false);
      // Simulate rejected credentials if password is literally "Password1"
      if (password.toLowerCase() === 'password1') {
        triggerValidationShake({
          password: 'That password is too common. Choose a stronger passkey.',
          form: 'Sign-in rejected: weak or unrecognized credentials.',
        });
        return;
      }
      const resolvedEmail = email.trim() || 'claire.botanist@sylva.garden';
      const derivedName =
        fullName.trim() ||
        resolvedEmail
          .split('@')[0]
          .split(/[._-]+/)
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ') ||
        'Claire Linnea';

      onAuthenticated({
        name: derivedName,
        email: resolvedEmail,
      });
    }, 520);
  };

  const handleQuickSso = (provider: string) => {
    setErrors({});
    setCardErrorHighlight(false);
    const resolvedEmail = email.trim() || 'claire.botanist@sylva.garden';
    const resolvedName =
      fullName.trim() ||
      (provider === 'Google' ? 'Claire Linnea' : 'Arthur Linnea');
    setIsSubmitting(true);
    window.setTimeout(() => {
      setIsSubmitting(false);
      onAuthenticated({
        name: resolvedName,
        email: resolvedEmail,
      });
    }, 420);
  };

  // Password rule checks for live checklist & strength meter
  const ruleMinLength = password.length >= 8;
  const ruleHasLetter = /[A-Za-z]/.test(password);
  const ruleHasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  const rulesPassedCount =
    (ruleMinLength ? 1 : 0) + (ruleHasLetter ? 1 : 0) + (ruleHasNumberOrSymbol ? 1 : 0);
  const passwordStrength =
    password.length === 0
      ? 0
      : Math.min(
          100,
          Math.round((rulesPassedCount / 3) * 82 + (password.length >= 12 ? 18 : 0)),
        );

  const hasAnyError = Boolean(
    errors.fullName || errors.email || errors.password || errors.form,
  );

  const fullNameValid = touched.fullName && !validateFullName(fullName);
  const emailValid = touched.email && !validateEmail(email);
  const passwordValid = touched.password && !validatePassword(password);

  const showPasswordRules =
    view === 'signup' || passwordFocused || Boolean(errors.password);

  return (
    <motion.div
      key={`card-shake-${shakeCount}`}
      animate={
        shakeCount > 0 && !prefersReducedMotion
          ? { x: [0, -11, 10, -8, 6, -3, 0] }
          : { x: 0 }
      }
      transition={{ duration: 0.44, ease: 'easeInOut' }}
      className="w-full max-w-[438px] pointer-events-auto"
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
        className={`glass-card-surface relative rounded-3xl p-7 sm:p-8 overflow-hidden ${
          cardErrorHighlight || hasAnyError ? 'glass-card-error' : ''
        }`}
      >
        {/* Subtle top specular highlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-px transition-opacity duration-300"
          style={{
            background: hasAnyError
              ? 'linear-gradient(90deg, transparent, var(--border-error), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent)',
          }}
        />

        <AnimatePresence mode="wait">
          <motion.form
            key={view}
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4.5"
            noValidate
          >
              {/* Header */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className="text-xs font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {theme === 'light'
                      ? 'Morning Conservatory · Golden Hour'
                      : 'Nocturnal Conservatory · Starlit Sky'}
                  </p>
                  <button
                    type="button"
                    onClick={handleFillDemoPass}
                    className="text-xs font-medium hover:underline cursor-pointer whitespace-nowrap shrink-0"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    Fill Demo Pass
                  </button>
                </div>
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

              {/* Form Inputs with Field-Level Validation & Micro-Shake */}
              <div className="space-y-3.5">
                {/* Full Name Field (Sign Up) */}
                {view === 'signup' && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="full-name"
                      className="block text-xs font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Full Name
                    </label>
                    <motion.div
                      key={`name-shake-${errors.fullName ? shakeCount : 0}`}
                      animate={
                        errors.fullName && shakeCount > 0 && !prefersReducedMotion
                          ? { x: [0, -6, 6, -4, 3, 0] }
                          : { x: 0 }
                      }
                      transition={{ duration: 0.34, ease: 'easeInOut' }}
                      className="relative"
                    >
                      <User
                        className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200"
                        style={{
                          color: errors.fullName
                            ? 'var(--text-error)'
                            : fullNameValid
                              ? 'var(--accent-primary)'
                              : 'var(--text-muted)',
                        }}
                      />
                      <input
                        id="full-name"
                        type="text"
                        value={fullName}
                        onChange={(e) => handleFullNameChange(e.target.value)}
                        onBlur={() => handleBlurField('fullName')}
                        placeholder="Claire Linnea"
                        autoComplete="name"
                        aria-invalid={Boolean(errors.fullName)}
                        aria-describedby={errors.fullName ? 'full-name-error' : undefined}
                        className={`glass-input w-full pl-10 pr-10 py-2.5 rounded-xl text-sm ${
                          errors.fullName
                            ? 'glass-input-error'
                            : fullNameValid
                              ? 'glass-input-valid'
                              : ''
                        }`}
                      />
                      <AnimatePresence>
                        {errors.fullName && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            transition={{ duration: 0.16 }}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ color: 'var(--text-error)' }}
                          >
                            <AlertCircle className="w-4 h-4" />
                          </motion.span>
                        )}
                        {!errors.fullName && fullNameValid && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            transition={{ duration: 0.16 }}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ color: 'var(--accent-primary)' }}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    <AnimatePresence initial={false}>
                      {errors.fullName && (
                        <motion.p
                          id="full-name-error"
                          role="alert"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                          className="text-xs font-medium flex items-center gap-1.5"
                          style={{ color: 'var(--text-error)' }}
                        >
                          <span>{errors.fullName}</span>
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Email Field */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="email-input"
                    className="block text-xs font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Email Address
                  </label>
                  <motion.div
                    key={`email-shake-${errors.email ? shakeCount : 0}`}
                    animate={
                      errors.email && shakeCount > 0 && !prefersReducedMotion
                        ? { x: [0, -6, 6, -4, 3, 0] }
                        : { x: 0 }
                    }
                    transition={{ duration: 0.34, ease: 'easeInOut' }}
                    className="relative"
                  >
                    <Mail
                      className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200"
                      style={{
                        color: errors.email
                          ? 'var(--text-error)'
                          : emailValid
                            ? 'var(--accent-primary)'
                            : 'var(--text-muted)',
                      }}
                    />
                    <input
                      id="email-input"
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      onBlur={() => handleBlurField('email')}
                      placeholder="claire.botanist@sylva.garden"
                      autoComplete="email"
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                      className={`glass-input w-full pl-10 pr-10 py-2.5 rounded-xl text-sm ${
                        errors.email
                          ? 'glass-input-error'
                          : emailValid
                            ? 'glass-input-valid'
                            : ''
                      }`}
                    />
                    <AnimatePresence>
                      {errors.email && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.6 }}
                          transition={{ duration: 0.16 }}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                          style={{ color: 'var(--text-error)' }}
                        >
                          <AlertCircle className="w-4 h-4" />
                        </motion.span>
                      )}
                      {!errors.email && emailValid && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.6 }}
                          transition={{ duration: 0.16 }}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  <AnimatePresence initial={false}>
                    {errors.email && (
                      <motion.p
                        id="email-error"
                        role="alert"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="text-xs font-medium flex items-center gap-1.5"
                        style={{ color: 'var(--text-error)' }}
                      >
                        <span>{errors.email}</span>
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Password Field */}
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
                    <motion.div
                      key={`password-shake-${errors.password ? shakeCount : 0}`}
                      animate={
                        errors.password && shakeCount > 0 && !prefersReducedMotion
                          ? { x: [0, -6, 6, -4, 3, 0] }
                          : { x: 0 }
                      }
                      transition={{ duration: 0.34, ease: 'easeInOut' }}
                      className="relative"
                    >
                      <Lock
                        className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200"
                        style={{
                          color: errors.password
                            ? 'var(--text-error)'
                            : passwordValid
                              ? 'var(--accent-primary)'
                              : 'var(--text-muted)',
                        }}
                      />
                      <input
                        id="password-input"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => {
                          setPasswordFocused(false);
                          handleBlurField('password');
                        }}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        placeholder="8+ chars with letter & number"
                        autoComplete={view === 'signin' ? 'current-password' : 'new-password'}
                        aria-invalid={Boolean(errors.password)}
                        aria-describedby={errors.password ? 'password-error' : undefined}
                        className={`glass-input w-full pl-10 pr-16 py-2.5 rounded-xl text-sm ${
                          errors.password
                            ? 'glass-input-error'
                            : passwordValid
                              ? 'glass-input-valid'
                              : ''
                        }`}
                      />

                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {errors.password && (
                          <span
                            aria-hidden="true"
                            className="p-0.5 pointer-events-none"
                            style={{ color: 'var(--text-error)' }}
                          >
                            <AlertCircle className="w-4 h-4" />
                          </span>
                        )}
                        {!errors.password && passwordValid && (
                          <span
                            aria-hidden="true"
                            className="p-0.5 pointer-events-none"
                            style={{ color: 'var(--accent-primary)' }}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="p-1 rounded-md cursor-pointer opacity-75 hover:opacity-100"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </motion.div>

                    <AnimatePresence initial={false}>
                      {errors.password && (
                        <motion.p
                          id="password-error"
                          role="alert"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                          className="text-xs font-medium"
                          style={{ color: 'var(--text-error)' }}
                        >
                          {errors.password}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {/* Live Credential Requirements & Compositor Strength Bar */}
                    <AnimatePresence initial={false}>
                      {showPasswordRules && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                          className="pt-1.5 space-y-2"
                        >
                          {/* Compositor scaleX strength bar */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span style={{ color: 'var(--text-muted)' }}>Passkey strength</span>
                              <span
                                className="font-mono-tabular font-medium"
                                style={{
                                  color:
                                    rulesPassedCount === 3
                                      ? 'var(--accent-primary)'
                                      : errors.password
                                        ? 'var(--text-error)'
                                        : 'var(--text-secondary)',
                                }}
                              >
                                {passwordStrength}%
                              </span>
                            </div>
                            <div
                              className="w-full h-1.5 rounded-full overflow-hidden"
                              style={{ backgroundColor: 'var(--border-subtle)' }}
                            >
                              <motion.div
                                initial={false}
                                animate={{ scaleX: Math.max(0.04, passwordStrength / 100) }}
                                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                                className="h-full w-full origin-left rounded-full"
                                style={{
                                  backgroundColor:
                                    rulesPassedCount === 3
                                      ? 'var(--accent-primary)'
                                      : errors.password
                                        ? 'var(--border-error)'
                                        : 'var(--accent-celestial)',
                                }}
                              />
                            </div>
                          </div>

                          {/* 3 Explicit Requirement Checks */}
                          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                            {[
                              { ok: ruleMinLength, label: '8+ chars' },
                              { ok: ruleHasLetter, label: '1+ letter' },
                              { ok: ruleHasNumberOrSymbol, label: '1+ digit/sym' },
                            ].map((req) => (
                              <div
                                key={req.label}
                                className="flex items-center gap-1 whitespace-nowrap"
                                style={{
                                  color: req.ok
                                    ? 'var(--accent-primary)'
                                    : errors.password
                                      ? 'var(--text-error)'
                                      : 'var(--text-muted)',
                                }}
                              >
                                <Check
                                  className="w-3 h-3 shrink-0 transition-transform duration-150"
                                  style={{
                                    opacity: req.ok ? 1 : 0.38,
                                    transform: req.ok ? 'scale(1)' : 'scale(0.85)',
                                  }}
                                />
                                <span>{req.label}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Form-Level Validation Summary or Recovery Confirmation Banner */}
              <AnimatePresence initial={false}>
                {errors.form && (
                  <motion.div
                    key={`form-alert-${shakeCount}`}
                    role="alert"
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-start gap-2"
                    style={{
                      backgroundColor: 'var(--bg-error-banner)',
                      border: '1px solid var(--border-error-banner)',
                      color: 'var(--text-error)',
                    }}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errors.form}</span>
                  </motion.div>
                )}

                {resetSent && (
                  <motion.div
                    key="reset-status"
                    role="status"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2"
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: theme === 'dark' ? '#a7f3d0' : '#065f46',
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Recovery instructions sent to {email}.</span>
                  </motion.div>
                )}
              </AnimatePresence>

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
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
