import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from './vapid';
import { getTranslations } from 'next-intl/server';
import type { ReminderType } from './practice-reminders';
import type { Translator } from '@/i18n/types';
import type { Locale } from '@/i18n/config';
import { recipientLocale } from '@/i18n/server';

// Supabase client with service role for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Lazy initialization to avoid build-time errors
let vapidConfigured = false;

function ensureVapidConfigured() {
  if (!vapidConfigured && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
  }
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

/** Le t() du namespace `push`, dans la langue du destinataire. */
export type PushT = Translator<'push'>;

/**
 * Un payload, ou de quoi le fabriquer dans la langue du destinataire :
 * une notification envoyee a plusieurs amis part dans la langue de
 * chacun (profile_private.locale), pas dans celle de qui l'a declenchee.
 */
export type LocalizedPayload =
  | NotificationPayload
  | ((t: PushT, locale: Locale) => NotificationPayload | Promise<NotificationPayload>);

async function resolvePayload(userId: string, payload: LocalizedPayload): Promise<NotificationPayload> {
  if (typeof payload !== 'function') return payload;
  const { data } = await supabaseAdmin.from('profile_private').select('locale').eq('user_id', userId).maybeSingle();
  const locale = recipientLocale(data?.locale);
  const t = await getTranslations({ locale, namespace: 'push' });
  return payload(t, locale);
}

export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'song_added'
  | 'song_mastered'
  | 'cover_posted'
  | 'song_wishlisted'
  | 'setlist_created'
  | 'band_created'
  | 'band_joined'
  | 'band_invitation'
  | 'challenge_created'
  | 'challenge_accepted'
  | 'challenge_completed'
  | 'challenge_won'
  | 'jam_session_started'
  | 'album_reviewed'
  | 'activity_reaction'
  | 'activity_comment'
  | 'exercise_shared'
  | 'rehearsal_created'
  | 'rehearsal_updated'
  | 'rehearsal_reminder'
  | 'rehearsal_today'
  | 'band_message'
  | 'gear_added'
  | 'song_learning'
  | 'badge_unlocked'
  | 'session_completed'
  | 'staff_application'
  | 'staff_application_reviewed'
  | 'blog_comment'
  | 'forum_reply'
  | 'forum_solved'
  | 'forum_mention'
  | ReminderType;

export async function sendPushNotification(
  userId: string,
  localizedPayload: LocalizedPayload,
  notificationType: NotificationType
): Promise<{ success: number; failed: number }> {
  try {
    ensureVapidConfigured();

    if (!vapidConfigured) {
      console.error('VAPID not configured, cannot send push notification');
      return { success: 0, failed: 0 };
    }

    // Get all push subscriptions for this user
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching push subscriptions:', error);
      return { success: 0, failed: 0 };
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`);
      return { success: 0, failed: 0 };
    }

    const payload = await resolvePayload(userId, localizedPayload);

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.svg',
      badge: payload.badge || '/icons/icon-96x96.svg',
      tag: payload.tag || notificationType,
      data: payload.data || {},
    });

    let successCount = 0;
    let failedCount = 0;

    // Send notification to all user's devices
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys as { p256dh: string; auth: string },
          },
          notificationPayload
        );
        successCount++;
      } catch (error) {
        console.error(`Failed to send notification to ${subscription.endpoint}:`, error);
        failedCount++;

        // If subscription is no longer valid (410 Gone), delete it
        if (error instanceof webpush.WebPushError && error.statusCode === 410) {
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('id', subscription.id);
          console.log(`Deleted invalid subscription ${subscription.id}`);
        }
      }
    }

    // Log the notification
    await supabaseAdmin.from('notification_logs').insert({
      user_id: userId,
      type: notificationType,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      success: successCount > 0,
    });

    console.log(`Sent notification to user ${userId}: ${successCount} success, ${failedCount} failed`);
    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: 0, failed: 0 };
  }
}

// Helper to send notifications to multiple users
export async function sendPushNotificationToMultipleUsers(
  notifications: Array<{
    userId: string;
    payload: LocalizedPayload;
    notificationType: NotificationType;
  }>
): Promise<{ totalSuccess: number; totalFailed: number }> {
  let totalSuccess = 0;
  let totalFailed = 0;

  for (const { userId, payload, notificationType } of notifications) {
    const result = await sendPushNotification(userId, payload, notificationType);
    totalSuccess += result.success;
    totalFailed += result.failed;
  }

  return { totalSuccess, totalFailed };
}
