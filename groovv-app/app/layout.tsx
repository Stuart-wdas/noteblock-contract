import type { Metadata, Viewport } from 'next';
import { Manrope, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { AudioPlayerProvider } from '@/providers/AudioPlayerProvider';
import { WalletProvider } from '@/providers/StarknetProvider';
import QueryProvider from '@/providers/QueryProvider';
import { GroovProvider } from '@/providers/GroovProvider';
import { NotificationProvider } from '@/providers/NotificationProvider';
import PWARegister from '@/components/PWARegister';
import PWAInstallButton from '@/components/PWAInstallButton';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Groovv',
  description: 'Play, listen, and trade music',
  applicationName: 'Groovv',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Groovv',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/icon-192x192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#09090b',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body
        className={`${manrope.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <QueryProvider>
          <WalletProvider>
            <NotificationProvider>
              <GroovProvider>
                <AudioPlayerProvider>{children}</AudioPlayerProvider>
              </GroovProvider>
            </NotificationProvider>
          </WalletProvider>
        </QueryProvider>
        <PWARegister />
        <PWAInstallButton />
      </body>
    </html>
  );
}
