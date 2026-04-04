'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    const isProd = process.env.NODE_ENV === 'production';
    if (typeof window === 'undefined') return;
    const hostname = window.location.hostname;
    const isLocalhost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1';
    const allowDev = process.env.NEXT_PUBLIC_PWA_DEV_ENABLED === 'true';
    if (!isProd && !allowDev && !isLocalhost) return;
    if (!('serviceWorker' in navigator)) return;

    const onLoad = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        void registration.update();
      } catch (error) {
        console.error('Service worker registration failed', error);
      }
    };

    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
