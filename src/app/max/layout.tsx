import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Max's board",
  description: 'Five ticks a week.',
  icons: {
    icon: [{ url: '/board/max-icon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: [{ url: '/board/max-icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, title: "Max's board", statusBarStyle: 'default' },
};

export default function MaxLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
