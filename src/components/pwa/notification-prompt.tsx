'use client';

import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { isIOSBrowserTab, usePushNotifications } from '@/lib/hooks/use-push-notifications';

const SEEN_KEY = 'ostinara_push_prompt_seen';

/**
 * « Activer les rappels ? », une seule fois.
 *
 * Les notifications sont actives par defaut, mais aucun navigateur ne
 * laisse une page s'abonner sans que la personne accepte sa demande — et
 * Safari ne l'affiche qu'apres un geste. L'encart porte ce geste : un
 * bouton, une fois. « Plus tard » ne revient pas ; l'interrupteur de
 * Profil > Reglages reste la pour changer d'avis.
 *
 * Pas d'encart dans un onglet Safari d'iPhone : les notifications n'y
 * existent qu'une fois l'app installee sur l'ecran d'accueil.
 */
export function NotificationPrompt() {
  const { supported, permission, isSubscribed, loading, message, enable } = usePushNotifications();
  // Lu au premier rendu client. Cote serveur, rien ne s'affiche de toute
  // facon : `supported` reste faux tant que le composant n'est pas monte.
  const [seen, setSeen] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem(SEEN_KEY) === 'true' || isIOSBrowserTab();
    } catch {
      return false;
    }
  });

  const dismiss = () => {
    setSeen(true);
    try {
      localStorage.setItem(SEEN_KEY, 'true');
    } catch {
      // Sans stockage, l'encart reviendra au prochain lancement : tant pis.
    }
  };

  if (seen || !supported || permission !== 'default' || isSubscribed) return null;

  const handleEnable = async () => {
    await enable();
    if (Notification.permission !== 'default') dismiss();
  };

  return (
    <section
      aria-labelledby="notif-prompt-title"
      className="mb-5 flex items-start gap-3 rounded-xl border border-border bg-card p-4"
    >
      <Bell className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h2 id="notif-prompt-title" className="text-sm font-semibold">
          Activer les rappels ?
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Un rappel quand un morceau prend la poussière, et les nouvelles de tes amis. Un par jour au plus.
        </p>
        {message && (
          <p role="status" className="mt-2 text-xs text-destructive">
            {message}
          </p>
        )}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleEnable}
            disabled={loading}
            className="inline-flex min-h-[36px] items-center rounded-full bg-primary px-4 text-[13px] font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Activation…' : 'Activer'}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex min-h-[36px] items-center rounded-full border border-border px-4 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Plus tard
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fermer"
        className="-m-1 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </section>
  );
}
