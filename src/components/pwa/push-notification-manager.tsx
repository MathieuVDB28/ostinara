'use client';

import { usePushNotifications } from '@/lib/hooks/use-push-notifications';

interface PushNotificationManagerProps {
  userId: string;
}

/**
 * Re-abonne en arriere-plan quand l'abonnement push a ete perdu.
 *
 * Ne dessine plus rien : le bouton « Activer les notifications » flottait
 * par-dessus le contenu de toutes les pages. Il est devenu une ligne de
 * Profil > Reglages (NotificationSetting).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function PushNotificationManager({ userId }: PushNotificationManagerProps) {
  usePushNotifications({ autoResubscribe: true });
  return null;
}
