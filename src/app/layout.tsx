import type { Metadata, Viewport } from 'next';
import { Literata, Karla, DM_Mono } from 'next/font/google';
import './globals.css';

const display = Literata({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-display' });
const body = Karla({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });
const mono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: "Murphy's Desk",
  description: 'Maths and English, one short session at a time.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2f5ef' },
    { media: '(prefers-color-scheme: dark)', color: '#101410' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
