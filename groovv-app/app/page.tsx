'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Loader2,
  Lock,
  Music4,
  RotateCcw,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MiniPlayer from '@/components/Song/MiniPlayer';
import { useAudioPlayer } from '@/providers/AudioPlayerProvider';
import BottomNavBar from '@/components/Navbar/Pages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWallet } from '@/providers/StarknetProvider';
import Image from 'next/image';
import { ONBOARDING_GENRES } from '@/lib/profile/genres';

type AuthView = 'signin' | 'signup' | 'forgot' | 'reset';
type SignupStep = 1 | 2;

type SessionUser = {
  contractAddress: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  lastLoginAt: string | null;
};

type AuthSessionPayload = {
  authenticated: boolean;
  user: SessionUser | null;
};

async function fetchAuthSession() {
  const response = await fetch('/api/auth/session', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to read auth session.');
  }
  return (await response.json()) as AuthSessionPayload;
}

async function postJson<T>(url: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    [key: string]: unknown;
  };

  if (!response.ok) {
    throw new Error(body.error || 'Request failed.');
  }

  return body as T;
}

function resolveSignatureParts(rawSignature: unknown) {
  if (Array.isArray(rawSignature)) {
    return rawSignature.map((part) => String(part));
  }

  if (
    rawSignature &&
    typeof rawSignature === 'object' &&
    'signature' in rawSignature &&
    Array.isArray((rawSignature as { signature: unknown }).signature)
  ) {
    return (rawSignature as { signature: unknown[] }).signature.map((part) =>
      String(part),
    );
  }

  return [] as string[];
}

export default function HomePage() {
  const heroWords = ['Play', 'Listen', 'Trade'];
  const { currentSong } = useAudioPlayer();
  const {
    address,
    library,
    isLibraryLoading,
    connectWallet,
    disconnectWallet,
    getAccount,
  } = useWallet();
  const queryClient = useQueryClient();

  const [showGate, setShowGate] = useState(true);
  const [heroWordIndex, setHeroWordIndex] = useState(0);
  const [authView, setAuthView] = useState<AuthView>('signin');

  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');

  const [signupDisplayName, setSignupDisplayName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [signupGenres, setSignupGenres] = useState<string[]>([]);

  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [isConnecting, setIsConnecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gateError, setGateError] = useState('');
  const [gateInfo, setGateInfo] = useState('');

  const {
    data: sessionPayload,
    isLoading: isSessionLoading,
    refetch: refetchSession,
  } = useQuery({
    queryKey: ['authSession'],
    queryFn: fetchAuthSession,
    staleTime: 30_000,
    retry: false,
  });

  const sessionUser = sessionPayload?.authenticated
    ? sessionPayload.user
    : null;
  const normalizedSessionWallet =
    sessionUser?.contractAddress?.toLowerCase() || '';
  const normalizedConnectedWallet = address?.toLowerCase() || '';

  const walletMatchesSession =
    Boolean(normalizedSessionWallet) &&
    Boolean(normalizedConnectedWallet) &&
    normalizedSessionWallet === normalizedConnectedWallet;

  const isLibraryReady =
    walletMatchesSession && !isLibraryLoading && Boolean(library);
  const isGateReadyToClose = Boolean(sessionUser) && isLibraryReady;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlResetToken = params.get('resetToken')?.trim();
    if (!urlResetToken) return;

    setResetToken(urlResetToken);
    setAuthView('reset');
    setGateInfo('Reset token detected. Enter a new password to continue.');
  }, []);

  useEffect(() => {
    if (!showGate) return;

    const timer = setInterval(() => {
      setHeroWordIndex((currentIndex) => (currentIndex + 1) % heroWords.length);
    }, 1500);

    return () => clearInterval(timer);
  }, [heroWords.length, showGate]);

  useEffect(() => {
    if (isGateReadyToClose) {
      const timer = setTimeout(() => setShowGate(false), 220);
      return () => clearTimeout(timer);
    }

    setShowGate(true);
  }, [isGateReadyToClose]);

  const helperText = useMemo(() => {
    if (isSessionLoading) {
      return 'Checking your session...';
    }

    if (!sessionUser) {
      if (authView === 'signup') {
        return signupStep === 1
          ? 'Step 1: Add account details.'
          : 'Step 2: Pick favorite genres for personalization.';
      }
      if (authView === 'forgot') {
        return 'Request a reset token for your account email.';
      }
      if (authView === 'reset') {
        return 'Reset your password and then sign in again.';
      }
      return 'Sign in with password (default) or use wallet-based login.';
    }

    if (!address) {
      return 'Session confirmed. Connect your linked wallet to load your library.';
    }

    if (!walletMatchesSession) {
      return 'Connected wallet does not match this account. Connect the linked wallet.';
    }

    if (isLibraryLoading) {
      return 'Loading your music data...';
    }

    return 'Authenticated. Opening your library...';
  }, [
    address,
    authView,
    isLibraryLoading,
    isSessionLoading,
    sessionUser,
    signupStep,
    walletMatchesSession,
  ]);

  const isBusy = isConnecting || isSubmitting;

  const handleConnectWallet = async () => {
    setGateError('');
    setGateInfo('');
    setIsConnecting(true);
    try {
      const connectedAddress = await connectWallet();
      if (
        sessionUser &&
        connectedAddress.toLowerCase() !==
          sessionUser.contractAddress.toLowerCase()
      ) {
        await disconnectWallet({ logoutSession: false });
        throw new Error('Please connect the wallet linked to this account.');
      }

      await queryClient.invalidateQueries({
        queryKey: ['userLibrary', connectedAddress.toLowerCase()],
      });
    } catch (error) {
      setGateError(
        error instanceof Error
          ? error.message
          : 'Wallet connection failed. Please try again.',
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handlePasswordSignIn = async () => {
    setGateError('');
    setGateInfo('');
    setIsSubmitting(true);
    try {
      await postJson('/api/auth/login', {
        email: signinEmail,
        password: signinPassword,
      });

      await refetchSession();
      setGateInfo('Signed in. Connect your linked wallet to continue.');
    } catch (error) {
      setGateError(
        error instanceof Error
          ? error.message
          : 'Sign in failed. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWalletSignIn = async () => {
    setGateError('');
    setGateInfo('');
    setIsSubmitting(true);
    setIsConnecting(true);

    try {
      const connectedAddress = await connectWallet();
      const challenge = await postJson<{
        challengeId: string;
        typedData: Record<string, unknown>;
      }>('/api/auth/wallet/challenge', {
        walletAddress: connectedAddress,
      });

      const account = await getAccount();
      if (!account) {
        throw new Error(
          'Wallet account unavailable. Reconnect wallet and retry.',
        );
      }

      const rawSignature = await account.signMessage(
        challenge.typedData as never,
      );
      const signature = resolveSignatureParts(rawSignature);
      if (signature.length === 0) {
        throw new Error('Wallet signature was empty.');
      }

      await postJson('/api/auth/wallet/verify', {
        challengeId: challenge.challengeId,
        walletAddress: connectedAddress,
        signature,
      });

      await refetchSession();
      await queryClient.invalidateQueries({
        queryKey: ['userLibrary', connectedAddress.toLowerCase()],
      });
      setGateInfo('Wallet sign-in successful. Loading your account...');
    } catch (error) {
      setGateError(
        error instanceof Error
          ? error.message
          : 'Wallet sign-in failed. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
      setIsConnecting(false);
    }
  };

  const handleSignupContinue = () => {
    setGateError('');
    setGateInfo('');

    if (!signupDisplayName.trim()) {
      setGateError('Display name is required.');
      return;
    }
    if (!signupEmail.trim()) {
      setGateError('Email is required.');
      return;
    }
    if (signupPassword.length < 8) {
      setGateError('Password must be at least 8 characters.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setGateError('Passwords do not match.');
      return;
    }

    setSignupStep(2);
  };

  const handleSurpriseGenres = () => {
    const shuffled = [...ONBOARDING_GENRES].sort(() => Math.random() - 0.5);
    const starterPack = shuffled.slice(0, Math.min(6, shuffled.length));
    setSignupGenres(starterPack);
    setGateError('');
    setGateInfo('Starter vibe selected. Adjust it however you like.');
  };

  const handleSignUp = async () => {
    setGateError('');
    setGateInfo('');
    if (signupGenres.length === 0) {
      setGateError('Pick at least one genre to continue.');
      return;
    }

    setIsSubmitting(true);
    try {
      const walletAddress = address || (await connectWallet());
      await postJson('/api/auth/signup', {
        email: signupEmail,
        password: signupPassword,
        displayName: signupDisplayName,
        walletAddress,
        likedGenres: signupGenres,
      });

      await refetchSession();
      await queryClient.invalidateQueries({
        queryKey: ['userLibrary', walletAddress.toLowerCase()],
      });
      setGateInfo('Account created. Your wallet is now linked.');
    } catch (error) {
      setGateError(
        error instanceof Error
          ? error.message
          : 'Sign up failed. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setGateError('');
    setGateInfo('');
    setIsSubmitting(true);

    try {
      const result = await postJson<{
        message?: string;
        devResetToken?: string;
      }>('/api/auth/forgot-password', {
        email: forgotEmail,
      });

      if (result.devResetToken) {
        setResetToken(result.devResetToken);
        setAuthView('reset');
        setGateInfo(
          'Reset token generated (development mode). Set a new password now.',
        );
      } else {
        setGateInfo(
          result.message || 'If the email exists, a reset link was sent.',
        );
      }
    } catch (error) {
      setGateError(
        error instanceof Error
          ? error.message
          : 'Could not start password reset right now.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setGateError('');
    setGateInfo('');

    if (newPassword !== confirmNewPassword) {
      setGateError('New passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await postJson('/api/auth/reset-password', {
        token: resetToken,
        newPassword,
      });

      setAuthView('signin');
      setResetToken('');
      setNewPassword('');
      setConfirmNewPassword('');
      setGateInfo('Password reset complete. Sign in with your new password.');
    } catch (error) {
      setGateError(
        error instanceof Error ? error.message : 'Failed to reset password.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='relative min-h-screen overflow-hidden text-white'>
      <div className='relative z-10'>
        <BottomNavBar />
        {currentSong ? <MiniPlayer /> : null}
      </div>

      <AnimatePresence>
        {showGate ? (
          <motion.section
            key='wallet-gate'
            initial={{ y: 0 }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className='fixed inset-0 z-2000 flex items-center justify-center bg-black px-4'
          >
            <div className='pointer-events-none absolute inset-0 overflow-hidden opacity-95'>
              <motion.div
                className='absolute -left-24 top-12 h-80 w-80 rounded-full bg-orange-500/20 blur-3xl'
                animate={{ x: [0, 30, 0], y: [0, 25, 0] }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <motion.div
                className='absolute right-0 top-32 h-96 w-96 rounded-full bg-pink-500/15 blur-3xl'
                animate={{ x: [0, -35, 0], y: [0, -20, 0] }}
                transition={{
                  duration: 12,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <motion.div
                className='absolute left-1/2 top-[65%] h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl'
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className='relative w-full max-w-3xl space-y-4 p-6 text-center'
            >
              <motion.h1
                className='text-5xl font-bold tracking-tight text-white sm:text-6xl flex place-content-center'
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.35 }}
              >
                <Image
                  src='title.svg'
                  width={350}
                  height={350}
                  alt='title'
                  className='invert-20'
                />
              </motion.h1>

              <div className='relative flex h-10 items-center justify-center overflow-hidden py-2'>
                <AnimatePresence mode='wait'>
                  <motion.span
                    key={heroWords[heroWordIndex]}
                    initial={{ opacity: 0, y: 14, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.96 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className='text-sm font-semibold uppercase tracking-[0.28em] text-orange-200/95'
                  >
                    {heroWords[heroWordIndex]}
                  </motion.span>
                </AnimatePresence>
              </div>

              <h2 className='text-2xl font-semibold tracking-tight'>
                {authView === 'signup'
                  ? 'Create Account'
                  : authView === 'forgot'
                    ? 'Forgot Password'
                    : authView === 'reset'
                      ? 'Reset Password'
                      : 'Sign In'}
              </h2>
              <p className='text-sm text-zinc-300/95'>{helperText}</p>

              {(authView === 'signin' || authView === 'signup') && (
                <div className='inline-flex rounded-xl border border-white/10 bg-black/35 p-1'>
                  <button
                    type='button'
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      authView === 'signin'
                        ? 'bg-white/10 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                    onClick={() => {
                      setAuthView('signin');
                      setGateError('');
                    }}
                  >
                    Sign In
                  </button>
                  <button
                    type='button'
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      authView === 'signup'
                        ? 'bg-white/10 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                    onClick={() => {
                      setAuthView('signup');
                      setSignupStep(1);
                      setGateError('');
                    }}
                  >
                    Sign Up
                  </button>
                </div>
              )}

              {authView === 'signin' ? (
                <div className='space-y-3 text-left'>
                  <Input
                    type='email'
                    value={signinEmail}
                    onChange={(event) => setSigninEmail(event.target.value)}
                    placeholder='Email'
                    className='border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500'
                    disabled={isBusy}
                  />
                  <Input
                    type='password'
                    value={signinPassword}
                    onChange={(event) => setSigninPassword(event.target.value)}
                    placeholder='Password'
                    className='border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500'
                    disabled={isBusy}
                  />
                  <Button
                    type='button'
                    onClick={handlePasswordSignIn}
                    disabled={isBusy}
                    className='w-full bg-linear-to-br from-pink-500 via-red-500 to-orange-500 text-white'
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        Signing in
                      </>
                    ) : (
                      <>
                        <Lock className='h-4 w-4' />
                        Sign In With Password
                      </>
                    )}
                  </Button>

                  <Button
                    type='button'
                    variant='outline'
                    onClick={handleWalletSignIn}
                    disabled={isBusy}
                    className='w-full border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900'
                  >
                    <Wallet className='h-4 w-4' />
                    Sign In With Wallet (No Password)
                  </Button>

                  <button
                    type='button'
                    onClick={() => {
                      setAuthView('forgot');
                      setGateError('');
                      setGateInfo('');
                    }}
                    className='w-full text-center text-xs text-zinc-400 hover:text-zinc-200'
                    disabled={isBusy}
                  >
                    Forgot password?
                  </button>
                </div>
              ) : null}

              {authView === 'signup' ? (
                <div className='space-y-3 text-left'>
                  {signupStep === 1 ? (
                    <>
                      <Input
                        value={signupDisplayName}
                        onChange={(event) =>
                          setSignupDisplayName(event.target.value)
                        }
                        placeholder='Display name'
                        className='border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500'
                        disabled={isBusy}
                      />
                      <Input
                        type='email'
                        value={signupEmail}
                        onChange={(event) => setSignupEmail(event.target.value)}
                        placeholder='Email'
                        className='border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500'
                        disabled={isBusy}
                      />
                      <Input
                        type='password'
                        value={signupPassword}
                        onChange={(event) =>
                          setSignupPassword(event.target.value)
                        }
                        placeholder='Password (min 8 chars)'
                        className='border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500'
                        disabled={isBusy}
                      />
                      <Input
                        type='password'
                        value={signupConfirmPassword}
                        onChange={(event) =>
                          setSignupConfirmPassword(event.target.value)
                        }
                        placeholder='Confirm password'
                        className='border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500'
                        disabled={isBusy}
                      />
                      <Button
                        type='button'
                        onClick={handleSignupContinue}
                        disabled={isBusy}
                        className='w-full bg-linear-to-br from-pink-500 via-red-500 to-orange-500 text-white'
                      >
                        Continue To Genres
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className='overflow-hidden rounded-2xl border border-white/15 bg-linear-to-br from-zinc-900 via-zinc-950 to-black p-3'>
                        <div className='flex items-start justify-between gap-3'>
                          <div>
                            <p className='inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.22em] text-orange-200/90'>
                              <Sparkles className='h-3.5 w-3.5' />
                              Sound Profile
                            </p>
                            <p className='mt-1 text-sm text-zinc-200'>
                              Pick the genres that match your taste.
                            </p>
                            <p className='text-xs text-zinc-400'>
                              We use this to tune your recommendations.
                            </p>
                          </div>
                          <div className='rounded-full border border-orange-400/40 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-100'>
                            {signupGenres.length} selected
                          </div>
                        </div>

                        <div className='mt-3 max-h-40 overflow-y-auto pr-1 [scrollbar-gutter:stable]'>
                          <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
                            {ONBOARDING_GENRES.map((genre) => {
                              const active = signupGenres.includes(genre);
                              return (
                                <button
                                  key={genre}
                                  type='button'
                                  disabled={isBusy}
                                  onClick={() =>
                                    setSignupGenres((current) =>
                                      current.includes(genre)
                                        ? current.filter(
                                            (entry) => entry !== genre,
                                          )
                                        : [...current, genre],
                                    )
                                  }
                                  className={`group rounded-xl border px-2.5 py-2 text-left transition ${
                                    active
                                      ? 'border-orange-300/70 bg-linear-to-br from-orange-500/25 via-pink-500/15 to-emerald-500/10 text-orange-100 shadow-[0_0_0_1px_rgba(251,146,60,0.35)]'
                                      : 'border-zinc-700/80 bg-zinc-900/75 text-zinc-200 hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-800/70'
                                  }`}
                                >
                                  <span className='flex items-center gap-1.5 text-[11px] font-semibold'>
                                    <Music4
                                      className={`h-3.5 w-3.5 ${
                                        active
                                          ? 'text-orange-200'
                                          : 'text-zinc-500 group-hover:text-zinc-300'
                                      }`}
                                    />
                                    {genre}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className='mt-3 flex gap-2'>
                          <Button
                            type='button'
                            variant='outline'
                            disabled={isBusy}
                            onClick={handleSurpriseGenres}
                            className='flex-1 border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800'
                          >
                            <Sparkles className='h-4 w-4' />
                            Surprise Me
                          </Button>
                          <Button
                            type='button'
                            variant='outline'
                            disabled={isBusy || signupGenres.length === 0}
                            onClick={() => setSignupGenres([])}
                            className='flex-1 border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800'
                          >
                            <RotateCcw className='h-4 w-4' />
                            Clear
                          </Button>
                        </div>
                      </div>

                      <div className='flex gap-2'>
                        <Button
                          type='button'
                          variant='outline'
                          onClick={() => setSignupStep(1)}
                          disabled={isBusy}
                          className='flex-1 border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900'
                        >
                          Back
                        </Button>
                        <Button
                          type='button'
                          onClick={handleSignUp}
                          disabled={isBusy}
                          className='flex-1 bg-linear-to-br from-pink-500 via-red-500 to-orange-500 text-white'
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className='h-4 w-4 animate-spin' />
                              Creating account
                            </>
                          ) : (
                            'Create Account'
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {authView === 'forgot' ? (
                <div className='space-y-3 text-left'>
                  <Input
                    type='email'
                    value={forgotEmail}
                    onChange={(event) => setForgotEmail(event.target.value)}
                    placeholder='Email'
                    className='border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500'
                    disabled={isBusy}
                  />
                  <Button
                    type='button'
                    onClick={handleForgotPassword}
                    disabled={isBusy}
                    className='w-full bg-linear-to-br from-pink-500 via-red-500 to-orange-500 text-white'
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        Generating reset token
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>
                  <button
                    type='button'
                    className='w-full text-center text-xs text-zinc-400 hover:text-zinc-200'
                    onClick={() => setAuthView('signin')}
                    disabled={isBusy}
                  >
                    Back to sign in
                  </button>
                </div>
              ) : null}

              {authView === 'reset' ? (
                <div className='space-y-3 text-left'>
                  <Input
                    value={resetToken}
                    onChange={(event) => setResetToken(event.target.value)}
                    placeholder='Reset token'
                    className='border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500'
                    disabled={isBusy}
                  />
                  <Input
                    type='password'
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder='New password'
                    className='border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500'
                    disabled={isBusy}
                  />
                  <Input
                    type='password'
                    value={confirmNewPassword}
                    onChange={(event) =>
                      setConfirmNewPassword(event.target.value)
                    }
                    placeholder='Confirm new password'
                    className='border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500'
                    disabled={isBusy}
                  />
                  <Button
                    type='button'
                    onClick={handleResetPassword}
                    disabled={isBusy}
                    className='w-full bg-linear-to-br from-pink-500 via-red-500 to-orange-500 text-white'
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        Updating password
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                  <button
                    type='button'
                    className='w-full text-center text-xs text-zinc-400 hover:text-zinc-200'
                    onClick={() => setAuthView('signin')}
                    disabled={isBusy}
                  >
                    Back to sign in
                  </button>
                </div>
              ) : null}

              {sessionUser ? (
                <div className='rounded-xl border border-zinc-700 bg-zinc-900/90 px-4 py-3 text-left text-xs text-zinc-300'>
                  <p>
                    Signed in as{' '}
                    <span className='font-semibold text-white'>
                      {sessionUser.email || sessionUser.displayName || 'User'}
                    </span>
                  </p>
                  <p className='mt-1 break-all text-zinc-500'>
                    Linked wallet: {sessionUser.contractAddress}
                  </p>
                  {!walletMatchesSession ? (
                    <Button
                      type='button'
                      onClick={handleConnectWallet}
                      disabled={isBusy}
                      className='mt-3 w-full bg-linear-to-br from-pink-500 via-red-500 to-orange-500 text-white'
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className='h-4 w-4 animate-spin' />
                          Connecting linked wallet
                        </>
                      ) : (
                        'Connect Linked Wallet'
                      )}
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {address ? (
                <p className='break-all text-xs text-zinc-500'>
                  Connected wallet: {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              ) : null}

              {gateInfo ? (
                <p className='text-xs text-emerald-300'>{gateInfo}</p>
              ) : null}
              {gateError ? (
                <p className='text-xs text-red-300'>{gateError}</p>
              ) : null}
            </motion.div>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
