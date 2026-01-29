'use client';

import { useState, useEffect, useCallback } from 'react';

interface PushNotificationManagerProps {
  userId: string;
}

export function PushNotificationManager({ userId }: PushNotificationManagerProps) {
  const [mounted, setMounted] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      checkSubscription();

      // Debug: Check service worker status
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          console.log('🔧 Service worker registrations:', registrations.length);
          registrations.forEach((reg, i) => {
            console.log(`🔧 SW ${i}:`, reg.active?.scriptURL, 'State:', reg.active?.state);
          });
        });
      }
    }
  }, [checkSubscription]);

  // Auto-resubscribe if subscription was lost
  useEffect(() => {
    if (permission !== 'granted' || !('serviceWorker' in navigator)) return;

    const checkAndResubscribe = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        const wasSubscribed = localStorage.getItem('ostinara_push_enabled') === 'true';

        if (!subscription && wasSubscribed) {
          console.log('Subscription lost, resubscribing automatically...');
          await subscribe();
        } else if (subscription) {
          setIsSubscribed(true);
          if (!wasSubscribed) {
            localStorage.setItem('ostinara_push_enabled', 'true');
          }
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    };

    checkAndResubscribe();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndResubscribe();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [permission]);

  async function requestPermission() {
    if (!('Notification' in window)) {
      alert('Ce navigateur ne supporte pas les notifications push');
      return;
    }

    setLoading(true);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === 'granted') {
        await subscribe();
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      alert('Erreur lors de la demande de permission');
    } finally {
      setLoading(false);
    }
  }

  async function subscribe() {
    if (!('serviceWorker' in navigator)) {
      console.error('❌ Cannot subscribe: service worker not supported');
      return;
    }

    setLoading(true);

    try {
      console.log('🔔 Starting subscription process...');

      // iOS detection
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
      console.log('📱 Device info:', { isIOS, isStandalone });

      if (isIOS && !isStandalone) {
        alert("Sur iOS, les notifications ne fonctionnent que si vous installez l'application sur votre ecran d'accueil.\n\n1. Appuyez sur le bouton Partager\n2. Selectionnez \"Sur l'ecran d'accueil\"\n3. Relancez l'app depuis l'icone");
        return;
      }

      // Check for VAPID public key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('❌ VAPID public key not configured!');
        alert('Erreur de configuration: VAPID public key manquante');
        return;
      }
      console.log('✅ VAPID public key found');

      // iOS needs more time to initialize service worker
      const timeout = isIOS ? 30000 : 10000;
      console.log(`⏳ Waiting for service worker (timeout: ${timeout}ms)...`);

      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Service worker timeout')), timeout)
        )
      ]) as ServiceWorkerRegistration;
      console.log('✅ Service worker ready:', registration);
      console.log('🔧 Service worker state:', registration.active?.state);

      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      console.log('🔍 Existing subscription:', subscription ? subscription.endpoint : 'none');

      if (!subscription) {
        console.log('📝 Creating new push subscription...');
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
        console.log('✅ Push subscription created:', subscription.endpoint);
      }

      // Send subscription to server
      console.log('📤 Sending subscription to server...');
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
              auth: arrayBufferToBase64(subscription.getKey('auth')!),
            },
          },
        }),
      });

      console.log('📥 Server response:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Subscription saved:', data);
        setIsSubscribed(true);
        localStorage.setItem('ostinara_push_enabled', 'true');
        console.log('🎉 Successfully subscribed to push notifications!');
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to save subscription:', errorData);
        throw new Error(`Server error: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error subscribing to push notifications:', error);

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;

      if (error instanceof Error && error.message === 'Service worker timeout') {
        if (isIOS && !isStandalone) {
          alert("Sur iOS, installez d'abord l'app sur votre ecran d'accueil");
        } else {
          alert('Le service worker n\'est pas disponible. Rechargez la page.');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    if (!('serviceWorker' in navigator)) return;

    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        setIsSubscribed(false);
        localStorage.removeItem('ostinara_push_enabled');
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
    } finally {
      setLoading(false);
    }
  }

  // Don't render anything until mounted on client
  if (!mounted) {
    return null;
  }

  // Don't render anything if notifications aren't supported
  if (!('Notification' in window)) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {permission === 'default' && (
        <button
          onClick={requestPermission}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg shadow-lg hover:bg-primary/90 transition disabled:opacity-50"
        >
          <BellIcon className="w-5 h-5" />
          <span className="font-medium">Activer les notifications</span>
        </button>
      )}

      {permission === 'granted' && (
        <div className="flex gap-2">
          {isSubscribed ? (
            <button
              onClick={unsubscribe}
              disabled={loading}
              className="p-3 bg-card border border-border rounded-lg shadow-lg hover:bg-accent transition disabled:opacity-50"
              title="Desactiver les notifications"
            >
              <BellOffIcon className="w-5 h-5 text-muted-foreground" />
            </button>
          ) : (
            <button
              onClick={subscribe}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg shadow-lg hover:bg-primary/90 transition disabled:opacity-50"
            >
              <BellIcon className="w-5 h-5" />
              <span className="font-medium">Reactiver les notifications</span>
            </button>
          )}
        </div>
      )}

      {permission === 'denied' && (
        <div className="px-4 py-3 bg-destructive/10 text-destructive rounded-lg shadow-lg text-sm max-w-xs">
          <p className="font-medium">Notifications bloquees</p>
          <p className="text-xs mt-1">Autorisez les notifications dans les parametres de votre navigateur</p>
        </div>
      )}
    </div>
  );
}

// Icons
function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function BellOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18.63 13A17.89 17.89 0 0 1 18 8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18 8a6 6 0 0 0-9.33-5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Utility functions
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
