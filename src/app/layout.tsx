import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppWrapper } from '@/components/layout/AppWrapper';

export const metadata: Metadata = {
  title: 'Discipline — Private Habit & Progression Tracker',
  description: 'A private habit and progress tracker designed around consistency, streaks, and RPG progression.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Discipline',
  },
  icons: {
    icon: '/icons/icon-192.svg',
    apple: '/icons/icon-192.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#080b11',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark bg-[#080b11] text-gray-100">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen bg-[#030508] text-gray-100 antialiased selection:bg-amber-500 selection:text-black">
        <AppWrapper>
          {children}
        </AppWrapper>

        {/* Service Worker Registration Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(err => {
                    console.log('SW reg failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
