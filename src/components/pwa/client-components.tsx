'use client';

import { ServiceWorkerRegistration } from './service-worker-registration';
import { PushNotificationManager } from './push-notification-manager';

interface ClientComponentsProps {
  userId?: string;
}

export function ClientComponents({ userId }: ClientComponentsProps) {
  return (
    <>
      <ServiceWorkerRegistration />
      {userId && <PushNotificationManager userId={userId} />}
    </>
  );
}
