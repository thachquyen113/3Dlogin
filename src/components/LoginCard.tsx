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
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
} from 'motion/react';
import type { AuthenticatedUser, AuthView, ThemeMode } from '../types';

interface LoginCardProps {
  theme: ThemeMode;
  onAuthenticated: (user: AuthenticatedUser) => void;
}

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
}

interface TouchedFields {
  fullName: boolean;
  email: boolean;
  password: boolean;
  confirmPassword?: boolean;
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const DISALLOWED_EMAIL_DOMAINS = ['tempmail.com', 'throwaway.email', 'mailinator.com', '10minutemail.com', 'fake.com'];
const COMMON_WEAK_PASSWORDS = ['password', 'password1', '12345678', 'qwerty123', 'admin123', 'sylva123', 'welcome1'];

function validateFullName(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Full name is required to personalize your study credentials.';
  }
  if (trimmed.length < 2) {
    return 'Full name must contain at least 2 characters.';
  }
  if (trimmed.length > 50) {
    return 'Full name cannot exceed 50 characters.';
  }
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(trimmed)) {
    return 'Full name can only contain letters, spaces, hyphens, and apostrophes.';
  }
  if (!/\s/.test(trimmed)) {
    return 'Please enter both first and last name (e.g., Claire Linnea).';
  }
  return undefined;
}

function validateEmail(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Email address is required.';
  }
  if (trimmed.length > 100) {
    return 'Email address cannot exceed 100 characters.';
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Enter a valid email address with domain (e.g. name@domain.com).';
  }
  const domain = trimmed.split('@')[1]?.toLowerCase();
  if (domain && DISALLOWED_EMAIL_DOMAINS.includes(domain)) {
    return 'Disposable or temporary email providers are not supported. Use your permanent email.';
  }
  return undefined;
}

function validatePassword(value: string, emailValue?: string): string | undefined {
  if (!value) {
    return 'Password is required.';
  }
  if (value.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (value.length > 64) {
    return 'Password cannot exceed 64 characters.';
  }
  if (/\s/.test(value)) {
    return 'Password cannot contain spaces.';
  }
  if (!/[a-z]/.test(value)) {
    return 'Password must contain at least one lowercase letter (a-z).';
  }
  if (!/[A-Z]/.test(value)) {
    return 'Password must contain at least one uppercase letter (A-Z).';
  }
  if (!/[0-9]/.test(value)) {
    return 'Password must contain at least one number (0-9).';
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(value)) {
    return 'Password must contain at least one special symbol (!@#$%^&*...).';
  }
  if (COMMON_WEAK_PASSWORDS.includes(value.toLowerCase())) {
    return 'This password is too easily guessed. Please choose a more secure passkey.';
  }
  if (emailValue && emailValue.includes('@')) {
    const usernamePart = emailValue.split('@')[0].toLowerCase();
    if (usernamePart.length >= 3 && value.toLowerCase().includes(usernamePart)) {
      return 'Password cannot contain your email username for security.';
    }
  }
  return undefined;
}

function validateConfirmPassword(password: string, confirmPassword: string): string | undefined {
  if (!confirmPassword) {
    return 'Please confirm your password.';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match. Please verify both entries.';
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({
    fullName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  // Incrementing key triggers damped shake animation on validation failure
  const [shakeCount, setShakeCount] = useState(0);
  const [cardErrorHighlight, setCardErrorHighlight] = useState(false);
  const shakeControls = useAnimationControls();

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
    setTouched({ fullName: false, email: false, password: false, confirmPassword: false });
    setCardErrorHighlight(false);
    setResetSent(false);
    setView(next);
  };

  const triggerValidationShake = (nextErrors: FieldErrors) => {
    setErrors(nextErrors);
    setShakeCount((prev) => prev + 1);
    setCardErrorHighlight(true);

    if (!prefersReducedMotion) {
      void shakeControls.start({
        x: [0, -9, 8, -6, 5, -2.5, 1, 0],
        rotateZ: [0, -0.75, 0.65, -0.45, 0.35, -0.15, 0],
        transition: {
          duration: 0.48,
          ease: [0.36, 0.07, 0.19, 0.97],
        },
      });
    }
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
        password: touched.password ? validatePassword(password, value) : prev.password,
        form: undefined,
      }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (touched.password || errors.password) {
      setErrors((prev) => ({
        ...prev,
        password: validatePassword(value, email),
        confirmPassword:
          view === 'signup' && (touched.confirmPassword || confirmPassword)
            ? validateConfirmPassword(value, confirmPassword)
            : prev.confirmPassword,
        form: undefined,
      }));
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (touched.confirmPassword || errors.confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: validateConfirmPassword(password, value),
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
      setErrors((prev) => ({ ...prev, password: validatePassword(password, email) }));
    } else if (field === 'confirmPassword' && view === 'signup') {
      setErrors((prev) => ({ ...prev, confirmPassword: validateConfirmPassword(password, confirmPassword) }));
    }
  };

  const handleFillDemoPass = () => {
    if (view === 'signup' && !fullName.trim()) {
      setFullName('Claire Linnea');
    }
    setEmail('claire.botanist@sylva.garden');
    setPassword('SylvaGarden8!');
    setConfirmPassword('SylvaGarden8!');
    setTouched({
      fullName: view === 'signup',
      email: true,
      password: view !== 'forgot',
      confirmPassword: view === 'signup',
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

      const confirmErr = validateConfirmPassword(password, confirmPassword);
      if (confirmErr) nextErrors.confirmPassword = confirmErr;
    }

    if (view !== 'forgot') {
      const passErr = validatePassword(password, email);
      if (passErr) nextErrors.password = passErr;
    }

    setTouched({
      fullName: view === 'signup',
      email: true,
      password: view !== 'forgot',
      confirmPassword: view === 'signup',
    });

    if (Object.keys(nextErrors).length > 0) {
      nextErrors.form =
        view === 'forgot'
          ? 'Please enter a valid permanent email address.'
          : view === 'signup'
            ? 'Please correct all highlighted account requirements below.'
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

  // Upgraded password requirements checklist
  const ruleMinLength = password.length >= 8;
  const ruleHasLower = /[a-z]/.test(password);
  const ruleHasUpper = /[A-Z]/.test(password);
  const ruleHasNumber = /[0-9]/.test(password);
  const ruleHasSymbol = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);
  const ruleNoSpace = password.length > 0 && !/\s/.test(password);

  const rulesPassedCount =
    (ruleMinLength ? 1 : 0) +
    (ruleHasLower ? 1 : 0) +
    (ruleHasUpper ? 1 : 0) +
    (ruleHasNumber ? 1 : 0) +
    (ruleHasSymbol ? 1 : 0) +
    (ruleNoSpace ? 1 : 0);

  const passwordStrength =
    password.length === 0
      ? 0
      : Math.min(
          100,
          Math.round((rulesPassedCount / 6) * 85 + (password.length >= 12 ? 15 : 0)),
        );

  const hasAnyError = Boolean(
    errors.fullName || errors.email || errors.password || errors.confirmPassword || errors.form,
  );

  const fullNameValid = touched.fullName && !validateFullName(fullName);
  const emailValid = touched.email && !validateEmail(email);
  const passwordValid = touched.password && !validatePassword(password, email);
  const confirmPasswordValid =
    view === 'signup' && Boolean(confirmPassword) && !validateConfirmPassword(password, confirmPassword);

  const showPasswordRules =
    view === 'signup' || passwordFocused || Boolean(errors.password);

  return (
    <motion.div
      animate={shakeControls}
      className="w-full max-w-[438px] pointer-events-auto"
      style={{
        perspective: '1200px',
        transformOrigin: '50% 50%',
        willChange: 'transform',
      }}
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

                          {/* 6 Explicit Security Requirement Checks */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
                            {[
                              { ok: ruleMinLength, label: '8+ chars' },
                              { ok: ruleHasLower, label: '1+ lowercase' },
                              { ok: ruleHasUpper, label: '1+ uppercase' },
                              { ok: ruleHasNumber, label: '1+ number' },
                              { ok: ruleHasSymbol, label: '1+ symbol' },
                              { ok: ruleNoSpace, label: 'No spaces' },
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

                {/* Confirm Password Field (Sign Up Mode) */}
                {view === 'signup' && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="confirm-password-input"
                      className="block text-xs font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Confirm Password
                    </label>
                    <motion.div
                      key={`confirm-pass-shake-${errors.confirmPassword ? shakeCount : 0}`}
                      animate={
                        errors.confirmPassword && shakeCount > 0 && !prefersReducedMotion
                          ? { x: [0, -6, 6, -4, 3, 0] }
                          : { x: 0 }
                      }
                      transition={{ duration: 0.34, ease: 'easeInOut' }}
                      className="relative"
                    >
                      <Lock
                        className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200"
                        style={{
                          color: errors.confirmPassword
                            ? 'var(--text-error)'
                            : confirmPasswordValid
                              ? 'var(--accent-primary)'
                              : 'var(--text-muted)',
                        }}
                      />
                      <input
                        id="confirm-password-input"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                        onBlur={() => handleBlurField('confirmPassword')}
                        placeholder="Re-enter password to confirm"
                        autoComplete="new-password"
                        aria-invalid={Boolean(errors.confirmPassword)}
                        aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                        className={`glass-input w-full pl-10 pr-16 py-2.5 rounded-xl text-sm ${
                          errors.confirmPassword
                            ? 'glass-input-error'
                            : confirmPasswordValid
                              ? 'glass-input-valid'
                              : ''
                        }`}
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {errors.confirmPassword && (
                          <span
                            aria-hidden="true"
                            className="p-0.5 pointer-events-none"
                            style={{ color: 'var(--text-error)' }}
                          >
                            <AlertCircle className="w-4 h-4" />
                          </span>
                        )}
                        {!errors.confirmPassword && confirmPasswordValid && (
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
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                          className="p-1 rounded-md cursor-pointer opacity-75 hover:opacity-100"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </motion.div>

                    <AnimatePresence initial={false}>
                      {errors.confirmPassword && (
                        <motion.p
                          id="confirm-password-error"
                          role="alert"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                          className="text-xs font-medium"
                          style={{ color: 'var(--text-error)' }}
                        >
                          {errors.confirmPassword}
                        </motion.p>
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
