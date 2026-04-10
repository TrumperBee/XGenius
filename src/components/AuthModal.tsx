'use client';

import { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase, signInWithEmail, signUpWithEmail, signInWithGoogle, getCurrentUser, signOut } from '@/lib/auth';
import { User } from '@/lib/auth';
import { Loader2, X, Mail, Lock, Eye, EyeOff, Check, AlertCircle, ArrowRight, ArrowLeft, UserPlus, LogIn, Sparkles, TrendingUp, Trophy, Bell, Zap, LogOut } from 'lucide-react';
import { mockTeams } from '@/data/mockData';
import styles from './AuthModal.module.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'signin' | 'signup';
  onSuccess?: (user: User) => void;
}

type Tab = 'signin' | 'signup';
type SignUpStep = 'email' | 'password' | 'confirm';
type SignInStep = 'email' | 'password';

export function AuthModal({ isOpen, onClose, initialTab = 'signup', onSuccess }: AuthModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.backdrop} />
        <div className={styles.content}>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" />
          </button>

          <div className={styles.logo}>
            <TrendingUp className="w-8 h-8" />
            <span>XGenius</span>
          </div>

          <p className={styles.tagline}>
            {activeTab === 'signup' 
              ? 'Join XGenius to save predictions, track your accuracy, and compete with friends.'
              : 'Welcome back! Sign in to continue your prediction journey.'}
          </p>

          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'signup' ? styles.active : ''}`}
              onClick={() => { setActiveTab('signup'); setError(''); }}
            >
              <UserPlus className="w-4 h-4" />
              Sign Up
              {activeTab === 'signup' && <div className={styles.tabIndicator} />}
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'signin' ? styles.active : ''}`}
              onClick={() => { setActiveTab('signin'); setError(''); }}
            >
              <LogIn className="w-4 h-4" />
              Sign In
              {activeTab === 'signin' && <div className={styles.tabIndicator} />}
            </button>
          </div>

          {activeTab === 'signup' ? (
            <SignUpForm
              onSuccess={onSuccess}
              onSwitchToSignIn={() => { setActiveTab('signin'); setError(''); }}
              onLoadingChange={setLoading}
              onStatusChange={setStatusMessage}
              onError={setError}
            />
          ) : (
            <SignInForm
              onSuccess={onSuccess}
              onSwitchToSignUp={() => { setActiveTab('signup'); setError(''); }}
              onLoadingChange={setLoading}
              onStatusChange={setStatusMessage}
              onError={setError}
            />
          )}

          {statusMessage && (
            <div className={styles.statusMessage}>
              <Loader2 className="w-4 h-4 animate-spin" />
              {statusMessage}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

interface SignUpFormProps {
  onSuccess?: (user: User) => void;
  onSwitchToSignIn: () => void;
  onLoadingChange: (loading: boolean) => void;
  onStatusChange: (message: string) => void;
  onError: (error: string) => void;
}

function SignUpForm({ onSuccess, onSwitchToSignIn, onLoadingChange, onStatusChange, onError }: SignUpFormProps) {
  const [step, setStep] = useState<SignUpStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    if (strength <= 1) return { label: 'Weak', color: '#ef4444', width: '25%' };
    if (strength <= 2) return { label: 'Fair', color: '#f59e0b', width: '50%' };
    if (strength <= 3) return { label: 'Strong', color: '#22c55e', width: '75%' };
    return { label: 'Very Strong', color: '#10b981', width: '100%' };
  };

  const passwordRequirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'At least one number', met: /[0-9]/.test(password) },
    { label: 'At least one uppercase letter', met: /[A-Z]/.test(password) },
  ];

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isStep1Valid = validateEmail(email);
  const isStep2Valid = password.length >= 8 && /[0-9]/.test(password);
  const isStep3Valid = passwordsMatch;

  const handleEmailSubmit = () => {
    if (isStep1Valid) {
      setStep('password');
    }
  };

  const handlePasswordSubmit = () => {
    if (isStep2Valid) {
      setStep('confirm');
    }
  };

  const handleSignUp = async () => {
    if (!isStep3Valid) return;
    onLoadingChange(true);
    onStatusChange('Creating your account...');
    onError('');

    try {
      const { data, error } = await signUpWithEmail(email, password);
      if (error) {
        if (error.message.includes('already registered')) {
          onError('An account with this email already exists. Try signing in instead.');
        } else if (error.message.includes('weak')) {
          onError('Password too weak. Use at least 8 characters with letters and numbers.');
        } else {
          onError(error.message);
        }
        onLoadingChange(false);
        onStatusChange('');
        return;
      }

      setShowConfetti(true);
      onStatusChange('Account created successfully!');
      
      setTimeout(async () => {
        const user = await getCurrentUser();
        if (user && onSuccess) {
          onSuccess(user);
        }
        onLoadingChange(false);
        onStatusChange('');
      }, 1500);
    } catch (err) {
      onError('XGenius is having trouble right now. Please try again in a few minutes.');
      onLoadingChange(false);
      onStatusChange('');
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    onStatusChange('Redirecting to Google...');
    onError('');

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        onError('Unable to connect to Google. Please check your internet connection and try again.');
        setGoogleLoading(false);
        onStatusChange('');
      }
    } catch (err) {
      onError('Connection issue. Please check your internet and try again.');
      setGoogleLoading(false);
      onStatusChange('');
    }
  };

  return (
    <div className={styles.formContainer}>
      {showConfetti && <ConfettiEffect />}

      <button
        className={styles.googleBtn}
        onClick={handleGoogleSignUp}
        disabled={googleLoading}
      >
        {googleLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Redirecting to Google...
          </>
        ) : (
          <>
            <svg className={styles.googleIcon} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </>
        )}
      </button>

      <div className={styles.divider}>
        <span>or</span>
      </div>

      <div className={styles.stepForm}>
        {step === 'email' && (
          <div className={styles.stepWrapper}>
            <div className={styles.fieldLabel}>Email address</div>
            <div className={`${styles.inputWrapper} ${email && !isStep1Valid ? styles.invalid : ''} ${isStep1Valid ? styles.valid : ''}`}>
              <Mail className={styles.inputIcon} />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailValid(validateEmail(e.target.value)); }}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                placeholder="you@example.com"
                autoFocus
              />
              {isStep1Valid && <Check className={`${styles.inputIcon} ${styles.checkIcon}`} />}
            </div>
            {email && !isStep1Valid && (
              <div className={styles.fieldError}>
                <AlertCircle className="w-3 h-3" />
                Enter a valid email address
              </div>
            )}
            <button
              className={styles.nextBtn}
              onClick={handleEmailSubmit}
              disabled={!isStep1Valid}
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 'password' && (
          <div className={styles.stepWrapper}>
            <button className={styles.backBtn} onClick={() => setStep('email')}>
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className={styles.fieldLabel}>Create a password</div>
            <div className={`${styles.inputWrapper} ${password && !isStep2Valid ? styles.invalid : ''} ${isStep2Valid ? styles.valid : ''}`}>
              <Lock className={styles.inputIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="Create a strong password"
                autoFocus
              />
              <button className={styles.showPassBtn} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className={styles.requirements}>
              {passwordRequirements.map((req, i) => (
                <div key={i} className={`${styles.requirement} ${req.met ? styles.met : ''}`}>
                  {req.met ? <Check className="w-3 h-3" /> : <div className={styles.reqDot} />}
                  {req.label}
                </div>
              ))}
            </div>
            {password.length > 0 && (
              <div className={styles.strengthMeter}>
                <div className={styles.strengthBar}>
                  <div 
                    className={styles.strengthFill} 
                    style={{ width: getPasswordStrength(password).width, background: getPasswordStrength(password).color }}
                  />
                </div>
                <span style={{ color: getPasswordStrength(password).color }}>
                  {getPasswordStrength(password).label}
                </span>
              </div>
            )}
            <button
              className={styles.nextBtn}
              onClick={handlePasswordSubmit}
              disabled={!isStep2Valid}
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <div className={styles.stepWrapper}>
            <button className={styles.backBtn} onClick={() => setStep('password')}>
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className={styles.fieldLabel}>Confirm password</div>
            <div className={`${styles.inputWrapper} ${confirmPassword && !passwordsMatch ? styles.invalid : ''} ${passwordsMatch ? styles.valid : ''}`}>
              <Lock className={styles.inputIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSignUp()}
                placeholder="Re-enter your password"
                autoFocus
              />
              {passwordsMatch && <Check className={`${styles.inputIcon} ${styles.checkIcon}`} />}
            </div>
            {confirmPassword && !passwordsMatch && (
              <div className={styles.fieldError}>
                <AlertCircle className="w-3 h-3" />
                Passwords do not match
              </div>
            )}
            {passwordsMatch && (
              <div className={styles.fieldSuccess}>
                <Check className="w-3 h-3" />
                Passwords match
              </div>
            )}
            <button
              className={styles.submitBtn}
              onClick={handleSignUp}
              disabled={!isStep3Valid}
            >
              <Sparkles className="w-4 h-4" />
              Create Account
            </button>
          </div>
        )}
      </div>

      <p className={styles.switchText}>
        Already have an account?{' '}
        <button onClick={onSwitchToSignIn}>Sign in</button>
      </p>
    </div>
  );
}

interface SignInFormProps {
  onSuccess?: (user: User) => void;
  onSwitchToSignUp: () => void;
  onLoadingChange: (loading: boolean) => void;
  onStatusChange: (message: string) => void;
  onError: (error: string) => void;
}

function SignInForm({ onSuccess, onSwitchToSignUp, onLoadingChange, onStatusChange, onError }: SignInFormProps) {
  const [step, setStep] = useState<SignInStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [shake, setShake] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const isEmailStepValid = validateEmail(email);
  const isPasswordStepValid = password.length > 0;
  const isLocked = lockoutUntil !== null && Date.now() < lockoutUntil;

  const handleEmailSubmit = () => {
    if (isEmailStepValid) {
      setStep('password');
    }
  };

  const handleSignIn = async () => {
    if (!isPasswordStepValid || isLocked) return;
    onLoadingChange(true);
    onStatusChange('Signing in...');
    setLocalError('');

    try {
      const { error } = await signInWithEmail(email, password);
      if (error) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 3) {
          const lockout = Date.now() + 30000;
          setLockoutUntil(lockout);
          setLocalError('Too many attempts. Please wait 30 seconds.');
          setTimeout(() => {
            setLockoutUntil(null);
            setAttempts(0);
          }, 30000);
        } else {
          setShake(true);
          setTimeout(() => setShake(false), 500);
          setLocalError('Incorrect email or password. Try again or reset password.');
        }
        onLoadingChange(false);
        onStatusChange('');
        return;
      }

      onStatusChange('Welcome back!');
      const user = await getCurrentUser();
      if (user && onSuccess) {
        onSuccess(user);
      }
      setAttempts(0);
      onLoadingChange(false);
      onStatusChange('');
    } catch (err) {
      setLocalError('Connection issue. Please check your internet and try again.');
      onLoadingChange(false);
      onStatusChange('');
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    onStatusChange('Redirecting to Google...');
    setLocalError('');

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setLocalError('Unable to connect to Google. Please check your internet connection and try again.');
        setGoogleLoading(false);
        onStatusChange('');
      }
    } catch (err) {
      setLocalError('Connection issue. Please check your internet and try again.');
      setGoogleLoading(false);
      onStatusChange('');
    }
  };

  return (
    <div className={styles.formContainer}>
      <button
        className={styles.googleBtn}
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
      >
        {googleLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Redirecting to Google...
          </>
        ) : (
          <>
            <svg className={styles.googleIcon} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </>
        )}
      </button>

      <div className={styles.divider}>
        <span>or</span>
      </div>

      <div className={styles.stepForm}>
        {step === 'email' && (
          <div className={styles.stepWrapper}>
            <div className={styles.fieldLabel}>Email address</div>
            <div className={`${styles.inputWrapper} ${email && !isEmailStepValid ? styles.invalid : ''} ${isEmailStepValid ? styles.valid : ''}`}>
              <Mail className={styles.inputIcon} />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailValid(validateEmail(e.target.value)); }}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                placeholder="you@example.com"
                autoFocus
              />
              {isEmailStepValid && <Check className={`${styles.inputIcon} ${styles.checkIcon}`} />}
            </div>
            {email && !isEmailStepValid && (
              <div className={styles.fieldError}>
                <AlertCircle className="w-3 h-3" />
                Enter a valid email address
              </div>
            )}
            <button
              className={styles.nextBtn}
              onClick={handleEmailSubmit}
              disabled={!isEmailStepValid}
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 'password' && (
          <div className={styles.stepWrapper}>
            <button className={styles.backBtn} onClick={() => setStep('email')}>
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className={styles.fieldLabel}>Password</div>
            <div className={`${styles.inputWrapper} ${shake ? styles.shake : ''} ${localError ? styles.invalid : ''}`}>
              <Lock className={styles.inputIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                placeholder="Enter your password"
                autoFocus
                disabled={isLocked}
              />
              <button className={styles.showPassBtn} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button className={styles.forgotLink}>
              Forgot password?
            </button>
            {isLocked && lockoutUntil && (
              <div className={styles.lockout}>
                <Loader2 className="w-4 h-4 animate-spin" />
                Try again in {Math.ceil((lockoutUntil - Date.now()) / 1000)}s
              </div>
            )}
            <button
              className={styles.submitBtn}
              onClick={handleSignIn}
              disabled={!isPasswordStepValid || isLocked}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          </div>
        )}
      </div>

      <p className={styles.switchText}>
        Don't have an account?{' '}
        <button onClick={onSwitchToSignUp}>Sign up</button>
      </p>
    </div>
  );
}

function ConfettiEffect() {
  return (
    <div className={styles.confetti}>
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className={styles.confettiPiece}
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 0.5}s`,
            backgroundColor: ['#22c55e', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'][Math.floor(Math.random() * 5)],
          }}
        />
      ))}
    </div>
  );
}

interface OnboardingModalProps {
  isOpen: boolean;
  user: User;
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingModal({ isOpen, user, onComplete, onSkip }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [favoriteTeams, setFavoriteTeams] = useState<number[]>([]);
  const [notifications, setNotifications] = useState({
    dailyDigest: true,
    highConfidence: true,
    matchAlerts: true,
  });
  const [predictionStyle, setPredictionStyle] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen) return null;

  const filteredTeams = mockTeams.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.short_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleComplete = async () => {
    const preferences = {
      favorite_teams: favoriteTeams,
      notifications,
      prediction_style: predictionStyle,
    };
    
    try {
      await supabase.from('user_preferences').upsert({
        user_id: user.id,
        ...preferences,
      });
    } catch (e) {
      console.error('Failed to save preferences:', e);
    }
    
    onComplete();
  };

  return createPortal(
    <div className={styles.overlay}>
      <div className={`${styles.modal} ${styles.onboarding}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.backdrop} />
        <div className={styles.content}>
          <div className={styles.onboardingHeader}>
            <Sparkles className="w-6 h-6 text-yellow-400" />
            <h2>Welcome to XGenius, {user.full_name?.split(' ')[0] || 'there'}!</h2>
            <p>Let's set up your experience in 3 quick steps</p>
          </div>

          <div className={styles.stepIndicator}>
            {[1, 2, 3].map((s) => (
              <div key={s} className={`${styles.stepDot} ${s <= step ? styles.active : ''}`}>
                {s < step ? <Check className="w-3 h-3" /> : s}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className={styles.onboardingStep}>
              <div className={styles.stepHeader}>
                <Trophy className="w-5 h-5 text-yellow-400" />
                <h3>Select your favorite teams</h3>
              </div>
              <p className={styles.stepDesc}>Get personalized alerts for teams you care about (up to 5)</p>
              
              <input
                type="text"
                placeholder="Search teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              
              <div className={styles.teamGrid}>
                {filteredTeams.map((team) => {
                  const isSelected = favoriteTeams.includes(team.id);
                  const isDisabled = !isSelected && favoriteTeams.length >= 5;
                  return (
                    <button
                      key={team.id}
                      className={`${styles.teamBtn} ${isSelected ? styles.selected : ''} ${isDisabled ? styles.disabled : ''}`}
                      onClick={() => {
                        if (isSelected) {
                          setFavoriteTeams(favoriteTeams.filter(id => id !== team.id));
                        } else if (favoriteTeams.length < 5) {
                          setFavoriteTeams([...favoriteTeams, team.id]);
                        }
                      }}
                      disabled={isDisabled}
                    >
                      <span className={styles.teamBadge}>{team.short_name}</span>
                      {isSelected && <Check className="w-4 h-4 text-green-400" />}
                    </button>
                  );
                })}
              </div>
              <p className={styles.stepHint}>{favoriteTeams.length}/5 selected</p>
            </div>
          )}

          {step === 2 && (
            <div className={styles.onboardingStep}>
              <div className={styles.stepHeader}>
                <Bell className="w-5 h-5 text-blue-400" />
                <h3>Choose notification preferences</h3>
              </div>
              <p className={styles.stepDesc}>Stay updated without the noise</p>
              
              <div className={styles.toggleList}>
                <div className={styles.toggleItem}>
                  <div>
                    <p className={styles.toggleLabel}>Daily prediction digest</p>
                    <p className={styles.toggleDesc}>Morning briefing with today's predictions</p>
                  </div>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={notifications.dailyDigest}
                      onChange={(e) => setNotifications({ ...notifications, dailyDigest: e.target.checked })}
                    />
                    <span className={styles.toggleSlider} />
                  </label>
                </div>
                <div className={styles.toggleItem}>
                  <div>
                    <p className={styles.toggleLabel}>High confidence alerts</p>
                    <p className={styles.toggleDesc}>Push notifications for 80%+ predictions</p>
                  </div>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={notifications.highConfidence}
                      onChange={(e) => setNotifications({ ...notifications, highConfidence: e.target.checked })}
                    />
                    <span className={styles.toggleSlider} />
                  </label>
                </div>
                <div className={styles.toggleItem}>
                  <div>
                    <p className={styles.toggleLabel}>Favorite team alerts</p>
                    <p className={styles.toggleDesc}>Match results for your favorite teams</p>
                  </div>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={notifications.matchAlerts}
                      onChange={(e) => setNotifications({ ...notifications, matchAlerts: e.target.checked })}
                    />
                    <span className={styles.toggleSlider} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={styles.onboardingStep}>
              <div className={styles.stepHeader}>
                <Zap className="w-5 h-5 text-purple-400" />
                <h3>Select your prediction style</h3>
              </div>
              <p className={styles.stepDesc}>We'll highlight predictions that match your preference</p>
              
              <div className={styles.styleCards}>
                {[
                  { id: 'conservative', label: 'Conservative', desc: 'Lower risk, smaller odds. Safe picks only.', icon: '🛡️' },
                  { id: 'balanced', label: 'Balanced', desc: 'Mix of safe and value picks. Best of both.', icon: '⚖️' },
                  { id: 'aggressive', label: 'Aggressive', desc: 'High risk, high reward. Value bets only.', icon: '🚀' },
                ].map((style) => (
                  <button
                    key={style.id}
                    className={`${styles.styleCard} ${predictionStyle === style.id ? styles.selected : ''}`}
                    onClick={() => setPredictionStyle(style.id as typeof predictionStyle)}
                  >
                    <span className={styles.styleIcon}>{style.icon}</span>
                    <span className={styles.styleLabel}>{style.label}</span>
                    <span className={styles.styleDesc}>{style.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.onboardingFooter}>
            {step > 1 && (
              <button className={styles.backBtn} onClick={() => setStep(step - 1)}>
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            {step < 3 ? (
              <button className={styles.nextBtn} onClick={() => setStep(step + 1)}>
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button className={styles.submitBtn} onClick={handleComplete}>
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
          <button className={styles.skipBtn} onClick={onSkip}>
            Skip for now
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface SignOutModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function SignOutModal({ isOpen, onConfirm, onCancel, loading }: SignOutModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className={styles.overlay}>
      <div className={`${styles.modal} ${styles.confirmModal}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.backdrop} />
        <div className={styles.content}>
          <div className={styles.confirmIcon}>
            <LogOut className="w-8 h-8 text-red-400" />
          </div>
          <h3>Sign out of XGenius?</h3>
          <p>You'll need to sign in again to save predictions and access your dashboard.</p>
          <div className={styles.confirmBtns}>
            <button className={styles.cancelBtn} onClick={onCancel} disabled={loading}>
              Cancel
            </button>
            <button className={styles.signOutBtn} onClick={onConfirm} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!mounted) return null;

  const icons = {
    success: <Check className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <Zap className="w-5 h-5" />,
  };

  return createPortal(
    <div className={`${styles.toast} ${styles[type]}`}>
      {icons[type]}
      <span>{message}</span>
      <button onClick={onClose} className={styles.toastClose}>
        <X className="w-4 h-4" />
      </button>
    </div>,
    document.body
  );
}
