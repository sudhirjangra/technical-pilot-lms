import { GlobalRouteLoader } from '@/components/global-route-loader';
import Providers from '@/components/providers';
import { PwaRegister } from '@/components/pwa-register';
import { APP_NAME, APP_URL } from '@repo/constants/app';
import { cn } from '@repo/shadcn/lib/utils';
import { Metadata, Viewport } from 'next';
import { ReactNode } from 'react';

/** Tailwindcss **/
import '@repo/shadcn/shadcn.css';
import { Toaster } from '@repo/shadcn/sonner';
import { cookies } from 'next/headers';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata = {
  metadataBase: new URL(APP_URL),
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description:
    'A comprehensive Learning Management System for institutional use. Purchase courses, learn through videos, track progress, and more.',
  keywords: [
    'LMS',
    'learning management system',
    'online courses',
    'education',
    'e-learning',
    'video courses',
    'assignments',
    'tests',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    title: APP_NAME,
    description:
      'Technical Pilot LMS — learn through structured courses with videos, assignments, and tests.',
    url: APP_URL,
    locale: 'en-US',
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: 'black-translucent',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-touch-fullscreen': 'yes',
  },
  icons: {
    icon: [
      { url: '/metadata/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/metadata/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/metadata/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/metadata/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/metadata/favicon-32x32.png',
    apple: '/metadata/apple-touch-icon.png',
    other: [
      { rel: 'icon', url: '/metadata/favicon.ico', sizes: '16x16 32x32', type: 'image/x-icon' },
    ],
  },
  manifest: '/manifest.webmanifest',
} satisfies Metadata;

const RootLayout = async ({
  children,
}: Readonly<{
  children: ReactNode;
}>) => {
  const select_font =
    (await cookies()).get('select-font')?.value ?? '--font-geist';
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'antialiased tracking-normal leading-normal',
        )}
        style={{
          fontFamily: `var(${select_font})`,
        }}
        suppressHydrationWarning
      >
        <Providers>
          <GlobalRouteLoader />
          {children}
        </Providers>
        <PwaRegister />
        <Toaster />
      </body>
    </html>
  );
};

export default RootLayout;

export const runtime = 'nodejs';

