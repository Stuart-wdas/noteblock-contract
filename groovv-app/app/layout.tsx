import type { Metadata } from 'next';
import { Manrope, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { AudioPlayerProvider } from '@/providers/AudioPlayerProvider';
import { WalletProvider } from '@/providers/StarknetProvider';
import QueryProvider from '@/providers/QueryProvider';

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
            <AudioPlayerProvider>{children}</AudioPlayerProvider>
          </WalletProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
