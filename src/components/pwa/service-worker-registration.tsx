'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    workbox: any;
  }
}

export function ServiceWorkerRegistration() {
  useEffect(() => {
    console.log('ServiceWorkerRegistration: Starting...');

    // iOS detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
    console.log('Device:', { isIOS, isStandalone });

    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.workbox !== undefined
    ) {
      console.log('Using workbox registration');
      const wb = window.workbox;

      wb.addEventListener('waiting', () => {
        console.log('Service worker is waiting, skipping waiting...');
        wb.addEventListener('controlling', () => {
          window.location.reload();
        });
        wb.messageSkipWaiting();
      });

      wb.register();
    } else {
      console.log('Using manual registration (fallback)');
      if ('serviceWorker' in navigator) {
        const registerSW = async () => {
          try {
            console.log('Starting SW registration...');
            const registration = await navigator.serviceWorker.register('/sw.js', {
              scope: '/',
              updateViaCache: 'none'
            });
            console.log('Service Worker registered successfully');
            console.log('SW scope:', registration.scope);

            if (registration.installing) {
              console.log('Service Worker installing...');
              registration.installing.addEventListener('statechange', (e: Event) => {
                const sw = e.target as ServiceWorker;
                console.log('SW state changed to:', sw.state);
              });
            }

            // Force update check on iOS
            if (isIOS) {
              console.log('Checking for SW updates (iOS)...');
              await registration.update();
            }
          } catch (error) {
            console.error('Service Worker registration failed:', error);
          }
        };

        // Register immediately on iOS, otherwise wait for load
        if (isIOS) {
          console.log('iOS detected, registering SW immediately');
          registerSW();
        } else {
          window.addEventListener('load', registerSW);
        }
      } else {
        console.error('Service workers are not supported in this browser');
      }
    }
  }, []);

  return null;
}
