export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contact@tunora.app';

if (typeof window === 'undefined') {
  // Server-side check
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('VAPID keys are not configured. Push notifications will not work.');
  }
}
