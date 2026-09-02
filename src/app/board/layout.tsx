import type { Metadata } from 'next';

// Per route, so the tab and the home screen say whose board it is. The pages
// themselves are client components and cannot export metadata, hence a layout.
export const metadata: Metadata = {
  title: "Murph's board",
  description: 'Five ticks a week.',
  icons: {
    icon: [{ url: '/board/murph-icon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: [{ url: '/board/murph-icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, title: "Murph's board", statusBarStyle: 'default' },
};

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
