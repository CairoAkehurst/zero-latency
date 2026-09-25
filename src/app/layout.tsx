import type { Metadata, Viewport } from 'next';
import { BootScript } from '@/components/BootScript';
import './globals.css';

export const metadata: Metadata = {
  title: 'ZeroLatency',
  description: 'An inbox that sorts itself before you look.',
  icons: { icon: '/logo-mark.svg' },
};

export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#ffffff' }, { media: '(prefers-color-scheme: dark)', color: '#161616' }],
};

// Applies the saved theme and font size before first paint so there is no flash.
const bootScript = `try{var s=JSON.parse(localStorage.getItem('zl:v1:settings')||'{}');var t=s.theme;if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);document.documentElement.setAttribute('data-font',s.fontSize==='default'?'default':'large');}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <BootScript code={bootScript} />
      </head>
      <body className="zl">{children}</body>
    </html>
  );
}
