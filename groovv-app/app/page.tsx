'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { createUser, updateUser } from '@/actions/userActions';
import MiniPlayer from '@/components/Song/MiniPlayer';
import { useAudioPlayer } from '@/providers/AudioPlayerProvider';
import BottomNavBar from '@/components/Navbar/Pages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWallet } from '@/providers/StarknetProvider';

export default function HomePage() {
  const heroWords = ['Play', 'Listen', 'Trade'];
  const { currentSong } = useAudioPlayer();
  const { address, library, isLibraryLoading, connectWallet } = useWallet();
  const queryClient = useQueryClient();

  const [showGate, setShowGate] = useState(true);
  const [heroWordIndex, setHeroWordIndex] = useState(0);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [signupUsername, setSignupUsername] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSignupSubmitting, setIsSignupSubmitting] = useState(false);
  const [signupCompleted, setSignupCompleted] = useState(false);
  const [gateError, setGateError] = useState('');

  const isLibraryReady =
    Boolean(address) && !isLibraryLoading && Boolean(library);
  const hasDisplayName = Boolean(library?.user?.displayName?.trim());
  const requiresSignup =
    authMode === 'signup' && !signupCompleted && !hasDisplayName;
  const isGateReadyToClose = isLibraryReady && !requiresSignup;

  useEffect(() => {
    if (hasDisplayName) setSignupCompleted(true);
  }, [hasDisplayName]);

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
    if (requiresSignup) {
      return 'Create your profile to unlock the app.';
    }
    if (!address) return 'Connect your wallet to start listening.';
    if (isLibraryLoading) return 'Loading your music data...';
    return 'Wallet connected. Opening your library...';
  }, [address, isLibraryLoading, requiresSignup]);

  const handleConnect = async () => {
    setGateError('');
    setIsConnecting(true);
    try {
      await connectWallet();
    } catch (error) {
      console.error(error);
      setGateError('Wallet connection failed. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSignup = async () => {
    const normalizedUsername = signupUsername.trim();
    if (!normalizedUsername) {
      setGateError('Please enter a username.');
      return;
    }

    setGateError('');
    setIsSignupSubmitting(true);
    try {
      const connectedAddress = address || (await connectWallet());
      try {
        await createUser({
          contractAddress: connectedAddress,
          displayName: normalizedUsername,
        });
      } catch (error) {
        await updateUser(connectedAddress, {
          displayName: normalizedUsername,
        });
      }

      await queryClient.invalidateQueries({
        queryKey: ['userLibrary', connectedAddress],
        exact: true,
      });
      await queryClient.refetchQueries({
        queryKey: ['userLibrary', connectedAddress],
        exact: true,
        type: 'all',
      });

      setSignupCompleted(true);
    } catch (error) {
      console.error(error);
      setGateError('Sign up failed. Please try again.');
    } finally {
      setIsSignupSubmitting(false);
    }
  };

  const isBusy = isConnecting || isSignupSubmitting;

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
              className='relative w-full max-w-lg space-y-5  p-6 text-center shadow-2xl backdrop-blur-xl'
            >
              <motion.h1
                className='text-5xl font-bold tracking-tight text-white sm:text-6xl'
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.35 }}
              >
                Groovv
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
                {authMode === 'signup' ? 'Create Account' : 'Connect Wallet'}
              </h2>
              <p className='text-sm text-zinc-300/95'>{helperText}</p>

              <div className='inline-flex rounded-xl border border-white/10 bg-black/35 p-1'>
                <button
                  type='button'
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    authMode === 'signin'
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  onClick={() => {
                    setAuthMode('signin');
                    setGateError('');
                  }}
                >
                  Sign In
                </button>
                <button
                  type='button'
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    authMode === 'signup'
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  onClick={() => {
                    setAuthMode('signup');
                    setGateError('');
                  }}
                >
                  Sign Up
                </button>
              </div>

              {authMode === 'signup' ? (
                <>
                  <Input
                    value={signupUsername}
                    onChange={(event) => setSignupUsername(event.target.value)}
                    placeholder='Choose a username'
                    className='border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500'
                    disabled={isBusy}
                  />
                  <Button
                    type='button'
                    onClick={handleSignup}
                    disabled={isBusy || (Boolean(address) && isLibraryLoading)}
                    className='w-full bg-linear-to-br from-pink-500 via-red-500 to-orange-500 text-white'
                  >
                    {isSignupSubmitting ? (
                      <>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        Creating account
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  type='button'
                  onClick={handleConnect}
                  disabled={isBusy || Boolean(address)}
                  className='w-full bg-linear-to-br from-pink-500 via-red-500 to-orange-500 text-white'
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className='h-4 w-4 animate-spin' />
                      Connecting
                    </>
                  ) : address ? (
                    'Connected'
                  ) : (
                    'Connect Wallet'
                  )}
                </Button>
              )}

              {address || isLibraryLoading ? (
                <p className='inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-200'>
                  {isLibraryLoading ? (
                    <>
                      <Loader2 className='h-4 w-4 animate-spin' />
                      Loading library
                    </>
                  ) : (
                    'Library ready'
                  )}
                </p>
              ) : null}

              {address ? (
                <p className='break-all text-xs text-zinc-500'>
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
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
