import type { Metadata, Viewport } from 'next';
import { Cinzel, Inter, Instrument_Serif, JetBrains_Mono, Literata } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import PwaRegister from '@/components/PwaRegister';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });
const latin = Cinzel({ subsets: ['latin'], variable: '--font-latin' });
const read = Literata({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-read' });
const phrase = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['italic', 'normal'], variable: '--font-phrase' });

export const metadata: Metadata = {
  title: { default: 'Admin | Joy Infant', template: '%s | Admin' },
  robots: { index: false, follow: false },
  applicationName: 'Joy Infant Admin',
  appleWebApp: { capable: true, title: 'Admin', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
  icons: { icon: [{ url: '/icons/star-32.png', sizes: '32x32', type: 'image/png' }, { url: '/icons/star-48.png', sizes: '48x48', type: 'image/png' }, { url: '/icons/star-192.png', sizes: '192x192', type: 'image/png' }], apple: '/icons/star-apple-touch.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#fcfbf8' }, { media: '(prefers-color-scheme: dark)', color: '#191918' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${latin.variable} ${phrase.variable} ${read.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
