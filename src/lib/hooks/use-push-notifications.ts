'use client';

import { useCallback, useEffect, useState } from 'react';

const ENABLED_KEY = 'ostinara_push_enabled';

interface Options {
  /**
   * Re-abonne en silence quand l'abonnement a ete perdu (mise a jour du
   * service worker, purge iOS). Un seul composant monte doit l'activer :
   * le gestionnaire du layout.
   */
  autoResubscribe?: boolean;
}

export interface PushNotificationsState {
  /** Faux tant que le composant n'est pas monte, ou si le navigateur ne gere pas les notifications. */
  supported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  loading: boolean;
  /** Message a afficher a cote du reglage quand l'activation echoue. */
  message: string | null;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

function isIOSBrowserTab() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone ||
    window.matchMedia('(display-mode: standalone)').matches;
  return isIOS && !isStandalone;
}

/**
 * Abonnement aux notifications push.
 *
 * La logique vivait dans PushNotificationManager, qui affichait en plus un
 * bouton « Activer les notifications » flottant sur toutes les pages, par
 * dessus le contenu. L'activation se fait desormais dans Profil > Reglages
 * (docs/refonte-ui.md) ; le gestionnaire du layout ne garde que le
 * re-abonnement automatique.
 */
export function usePushNotifications({ autoResubscribe = false }: Options = {}): PushNotificationsState {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    if (isIOSBrowserTab()) {
      setMessage("Sur iPhone, installe d'abord l'app sur l'écran d'accueil (Partager › Sur l'écran d'accueil), puis relance-la depuis l'icône.");
      return;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.error('Push: NEXT_PUBLIC_VAPID_PUBLIC_KEY manquante');
      setMessage("Les notifications ne sont pas configurées sur ce serveur.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // iOS met plus de temps a initialiser le service worker
      const timeout = /iPad|iPhone|iPod/.test(navigator.userAgent) ? 30000 : 10000;
      const registration = (await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Service worker timeout')), timeout)
        ),
      ])) as ServiceWorkerRegistration;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Server error: ${errorData.error || response.statusText}`);
      }

      setIsSubscribed(true);
      localStorage.setItem(ENABLED_KEY, 'true');
    } catch (error) {
      console.error('Push: abonnement impossible', error);
      setMessage(
        error instanceof Error && error.message === 'Service worker timeout'
          ? "Le service worker ne répond pas. Recharge la page et réessaie."
          : "L'activation a échoué. Réessaie dans un instant."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!('Notification' in window)) return;
    setSupported(true);
    setPermission(Notification.permission);

    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setIsSubscribed(!!subscription))
      .catch((error) => console.error('Push: lecture de l\'abonnement impossible', error));
  }, []);

  useEffect(() => {
    if (!autoResubscribe || permission !== 'granted' || !('serviceWorker' in navigator)) return;

    const checkAndResubscribe = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        const wasSubscribed = localStorage.getItem(ENABLED_KEY) === 'true';

        if (!subscription && wasSubscribed) {
          await subscribe();
        } else if (subscription) {
          setIsSubscribed(true);
          if (!wasSubscribed) localStorage.setItem(ENABLED_KEY, 'true');
        }
      } catch (error) {
        console.error('Push: verification de l\'abonnement impossible', error);
      }
    };

    checkAndResubscribe();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkAndResubscribe();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [autoResubscribe, permission, subscribe]);

  const enable = useCallback(async () => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      await subscribe();
      return;
    }

    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm === 'granted') await subscribe();
    } catch (error) {
      console.error('Push: demande de permission impossible', error);
      setMessage("La demande d'autorisation a échoué.");
    } finally {
      setLoading(false);
    }
  }, [subscribe]);

  const disable = useCallback(async () => {
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
      }

      setIsSubscribed(false);
      localStorage.removeItem(ENABLED_KEY);
    } catch (error) {
      console.error('Push: desabonnement impossible', error);
      setMessage("La désactivation a échoué. Réessaie dans un instant.");
    } finally {
      setLoading(false);
    }
  }, []);

  return { supported, permission, isSubscribed, loading, message, enable, disable };
}

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
