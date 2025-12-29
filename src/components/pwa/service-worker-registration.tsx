'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    workbox: any;
  }
}

export function ServiceWorkerRegistration() {
  useEffect(() => {
    console.log('🚀 ServiceWorkerRegistration: Starting...');
    console.log('🔍 window.workbox:', typeof window.workbox);
    console.log('🔍 serviceWorker in navigator:', 'serviceWorker' in navigator);

    // iOS detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
    console.log('📱 Device:', { isIOS, isStandalone });

    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.workbox !== undefined
    ) {
      console.log('✅ Using workbox registration');
      const wb = window.workbox;

      wb.addEventListener('waiting', () => {
        console.log('⏳ Service worker is waiting, skipping waiting...');
        wb.addEventListener('controlling', () => {
          window.location.reload();
        });
        wb.messageSkipWaiting();
      });

      wb.register();
    } else {
      console.log('⚠️ Workbox not found, using manual registration (fallback)');
      if ('serviceWorker' in navigator) {
        const registerSW = async () => {
          try {
            console.log('📝 Starting manual SW registration...');
            console.log('📍 Registering /sw.js with scope /');

            const registration = await navigator.serviceWorker.register('/sw.js', {
              scope: '/',
              updateViaCache: 'none'
            });

            console.log('✅ Service Worker registered successfully!');
            console.log('🔧 SW scope:', registration.scope);
            console.log('🔧 SW state:', registration.active?.state);
            console.log('🔧 SW installing:', !!registration.installing);
            console.log('🔧 SW waiting:', !!registration.waiting);
            console.log('🔧 SW active:', !!registration.active);

            if (registration.installing) {
              console.log('⏳ Service Worker installing...');
              registration.installing.addEventListener('statechange', (e: Event) => {
                const sw = e.target as ServiceWorker;
                console.log('🔄 SW state changed to:', sw.state);
              });
            }

            if (registration.active) {
              console.log('✅ Service Worker is active and ready!');
            }

            // Force update check on iOS
            if (isIOS) {
              console.log('🔄 Checking for SW updates (iOS)...');
              await registration.update();
            }

            // Verify registration after a short delay
            setTimeout(async () => {
              const reg = await navigator.serviceWorker.getRegistration();
              console.log('🔍 Verification - SW registered:', !!reg);
              if (reg) {
                console.log('✅ Service Worker confirmed active');
              } else {
                console.error('❌ Service Worker registration lost!');
              }
            }, 2000);

          } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
            if (error instanceof Error) {
              console.error('Error message:', error.message);
              console.error('Error stack:', error.stack);
            }
          }
        };

        // Register immediately
        console.log('🎯 Registering SW immediately (not waiting for load event)');
        registerSW();
      } else {
        console.error('❌ Service workers are not supported in this browser');
      }
    }
  }, []);

  return null;
}
