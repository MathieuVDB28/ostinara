'use client';

import { useState, useEffect, useCallback } from 'react';

interface PushNotificationManagerProps {
  userId: string;
}

export function PushNotificationManager({ userId }: PushNotificationManagerProps) {
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
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, [checkSubscription]);

  // Auto-resubscribe if subscription was lost
  useEffect(() => {
    if (permission !== 'granted' || !('serviceWorker' in navigator)) return;

    const checkAndResubscribe = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        const wasSubscribed = localStorage.getItem('tunora_push_enabled') === 'true';

        if (!subscription && wasSubscribed) {
          console.log('Subscription lost, resubscribing automatically...');
          await subscribe();
        } else if (subscription) {
          setIsSubscribed(true);
          if (!wasSubscribed) {
            localStorage.setItem('tunora_push_enabled', 'true');
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
      console.error('Service worker not supported');
      return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
      alert("Sur iOS, les notifications ne fonctionnent que si vous installez l'application sur votre ecran d'accueil.\n\n1. Appuyez sur le bouton Partager\n2. Selectionnez \"Sur l'ecran d'accueil\"\n3. Relancez l'app depuis l'icone");
      return;
    }

    setLoading(true);

    try {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('VAPID public key not configured');
        alert('Erreur de configuration: VAPID public key manquante');
        return;
      }

      const timeout = isIOS ? 30000 : 10000;
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Service worker timeout')), timeout)
        )
      ]) as ServiceWorkerRegistration;

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      // Send subscription to server
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

      if (response.ok) {
        setIsSubscribed(true);
        localStorage.setItem('tunora_push_enabled', 'true');
        console.log('Subscribed to push notifications');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error');
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);

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
        localStorage.removeItem('tunora_push_enabled');
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
    } finally {
      setLoading(false);
    }
  }

  // Don't render anything if notifications aren't supported
  if (typeof window === 'undefined' || !('Notification' in window)) {
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
