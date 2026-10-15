"use client";

import { useState, useTransition } from "react";
import { AlarmClock, Bell, BellOff } from "lucide-react";
import { usePushNotifications } from "@/lib/hooks/use-push-notifications";
import { updateProfile } from "@/lib/actions/profile";

function Switch({
  on,
  labelledBy,
  disabled,
  onClick,
}: {
  on: boolean;
  labelledBy: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={onClick}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
        on ? "bg-primary" : "bg-muted shadow-[inset_0_0_0_1px_var(--input)]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-1 h-5 w-5 rounded-full bg-card shadow-sm transition-[left] ${
          on ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

/**
 * Le reglage des notifications push, a sa place dans les Reglages.
 *
 * Il remplace le bouton qui flottait en bas a droite de toutes les pages.
 * Une ligne, un interrupteur, et une phrase quand il faut agir ailleurs
 * (navigateur qui bloque, iPhone sans l'app installee).
 */
export function NotificationSetting() {
  const { supported, permission, isSubscribed, loading, message, enable, disable } =
    usePushNotifications();

  const blocked = permission === "denied";
  const on = isSubscribed && permission === "granted";

  const description = !supported
    ? "Ce navigateur ne gère pas les notifications"
    : blocked
      ? "Bloquées dans les réglages du navigateur"
      : on
        ? "Actives sur cet appareil"
        : "Désactivées";

  const Icon = on ? Bell : BellOff;

  return (
    <div className="py-3">
      <div className="flex min-h-[44px] items-center gap-4">
        <Icon className="h-[22px] w-[22px] shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span id="notif-label" className="block text-sm font-medium">
            Notifications
          </span>
          <span className="block text-xs text-muted-foreground">{description}</span>
        </span>
        <Switch
          on={on}
          labelledBy="notif-label"
          disabled={!supported || blocked || loading}
          onClick={on ? disable : enable}
        />
      </div>
      {message && (
        <p role="status" className="mt-2 text-xs text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * Les rappels de pratique, a part des notifications d'amis : on peut ne
 * plus vouloir se faire relancer sur un morceau sans perdre les demandes
 * d'amis. Le reglage vit sur le profil, lu par le cron des rappels.
 */
export function PracticeRemindersSetting({ initialOn }: { initialOn: boolean }) {
  const [on, setOn] = useState(initialOn);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = !on;
    setOn(next);
    setError(null);
    startTransition(async () => {
      const result = await updateProfile({ practice_reminders: next });
      if (!result.success) {
        setOn(!next);
        setError("Le réglage n'a pas pu être enregistré. Réessaie.");
      }
    });
  };

  return (
    <div className="py-3">
      <div className="flex min-h-[44px] items-center gap-4">
        <AlarmClock className="h-[22px] w-[22px] shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span id="reminders-label" className="block text-sm font-medium">
            Rappels de pratique
          </span>
          <span className="block text-xs text-muted-foreground">
            {on ? "Morceau délaissé, pause, série, plan de la semaine — un par jour au plus" : "Désactivés"}
          </span>
        </span>
        <Switch on={on} labelledBy="reminders-label" disabled={pending} onClick={toggle} />
      </div>
      {error && (
        <p role="status" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
