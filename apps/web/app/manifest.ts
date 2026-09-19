import { APP_NAME } from '@repo/constants/app';
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: 'Technical Pilot',
    description: 'Learn through structured courses with videos, assignments, and tests.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['fullscreen', 'standalone', 'window-controls-overlay'],
    orientation: 'portrait-primary',
    theme_color: '#ffffff',
    background_color: '#ffffff',
    prefer_related_applications: false,
    categories: ['education', 'training'],
    icons: [
      {
        src: '/metadata/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/metadata/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/metadata/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/metadata/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/metadata/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        url: '/dashboard',
        icons: [
          {
            src: '/metadata/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Courses',
        short_name: 'Courses',
        url: '/courses',
        icons: [
          {
            src: '/metadata/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
    ],
  };
}
