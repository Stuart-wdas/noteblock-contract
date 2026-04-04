'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

type PromptOutcome = 'accepted' | 'dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: PromptOutcome;
    platform: string;
  }>;
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);

  useEffect(() => {
    setIsInstalled(isStandaloneMode());

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener(
      'beforeinstallprompt',
      onBeforeInstallPrompt as EventListener,
    );
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        onBeforeInstallPrompt as EventListener,
      );
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const canInstall = useMemo(
    () => Boolean(deferredPrompt) && !isInstalled,
    [deferredPrompt, isInstalled],
  );

  const onInstallClick = useCallback(async () => {
    if (!deferredPrompt || isPrompting) return;
    setIsPrompting(true);

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error('Failed to open install prompt', error);
    } finally {
      setIsPrompting(false);
    }
  }, [deferredPrompt, isPrompting]);

  if (!canInstall) return null;

  return (
    <div className='pointer-events-none fixed bottom-24 right-4 z-[1002] md:bottom-6'>
      <Button
        type='button'
        onClick={onInstallClick}
        disabled={isPrompting}
        className='pointer-events-auto rounded-full border border-orange-400/40 bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 text-white shadow-lg'
      >
        <Download className='mr-1.5 h-4 w-4' />
        {isPrompting ? 'Opening...' : 'Install App'}
      </Button>
    </div>
  );
}

