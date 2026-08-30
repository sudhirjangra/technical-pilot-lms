import { GlobalRouteLoader } from '@/components/global-route-loader';
import Providers from '@/components/providers';
import { APP_NAME, APP_URL } from '@repo/constants/app';
import { cn } from '@repo/shadcn/lib/utils';
import { Metadata } from 'next';
import { Geist, Geist_Mono, Roboto, Roboto_Mono } from 'next/font/google';
import { ReactNode } from 'react';

/** Tailwindcss **/
import '@repo/shadcn/shadcn.css';
import { Toaster } from '@repo/shadcn/sonner';
import { cookies } from 'next/headers';

const geist = Geist({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-geist',
});

const geist_mono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-geist-mono',
});

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-roboto',
});

const roboto_mono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-roboto-mono',
});

export const metadata = {
  metadataBase: new URL(APP_URL),
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
  manifest: '/metadata/site.webmanifest',
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) document.documentElement.classList.add('dark');
                  else document.documentElement.classList.remove('dark');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={cn(
          'antialiased tracking-normal leading-normal',
          geist.variable,
          geist_mono.variable,
          roboto.variable,
          roboto_mono.variable,
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
        <Toaster />
      </body>
    </html>
  );
};

export default RootLayout;

export const runtime = 'nodejs';
