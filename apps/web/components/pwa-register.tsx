'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.debug('Service Worker registered with scope:', registration.scope);
          })
          .catch((error) => {
            console.debug('Service Worker registration failed:', error);
          });
      });
    }
  }, []);

  return null;
}
