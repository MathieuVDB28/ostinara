"use client";

import { useState, useTransition } from "react";
import { AlarmClock, Bell, BellOff, CalendarCheck, CalendarClock, Guitar, Moon, Users, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePushNotifications } from "@/lib/hooks/use-push-notifications";
import { updateProfile } from "@/lib/actions/profile";

export function Switch({
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
  const t = useTranslations("profile.notifications");
  const { supported, permission, isSubscribed, loading, message, enable, disable } =
    usePushNotifications();

  const blocked = permission === "denied";
  const on = isSubscribed && permission === "granted";

  const description = !supported
    ? t("unsupported")
    : blocked
      ? t("blocked")
      : on
        ? t("on")
        : t("off");

  const Icon = on ? Bell : BellOff;

  return (
    <div className="py-3">
      <div className="flex min-h-[44px] items-center gap-4">
        <Icon className="h-[22px] w-[22px] shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span id="notif-label" className="block text-sm font-medium">
            {t("title")}
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
 * Un reglage du profil prive, en interrupteur : ecrit tout de suite, revient
 * en arriere si l'enregistrement echoue.
 */
function ProfileToggle({
  id,
  icon: Icon,
  label,
  onDescription,
  offDescription,
  initialOn,
  save,
}: {
  id: string;
  icon: LucideIcon;
  label: string;
  onDescription: string;
  offDescription: string;
  initialOn: boolean;
  save: (on: boolean) => Promise<{ success: boolean }>;
}) {
  const t = useTranslations("profile.notifications");
  const [on, setOn] = useState(initialOn);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = !on;
    setOn(next);
    setError(null);
    startTransition(async () => {
      const result = await save(next);
      if (!result.success) {
        setOn(!next);
        setError(t("saveFailed"));
      }
    });
  };

  return (
    <div className="py-3">
      <div className="flex min-h-[44px] items-center gap-4">
        <Icon className="h-[22px] w-[22px] shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span id={id} className="block text-sm font-medium">
            {label}
          </span>
          <span className="block text-xs text-muted-foreground">
            {on ? onDescription : offDescription}
          </span>
        </span>
        <Switch on={on} labelledBy={id} disabled={pending} onClick={toggle} />
      </div>
      {error && (
        <p role="status" className="mt-2 text-xs text-destructive">
          {error}
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
  const t = useTranslations("profile.notifications");
  return (
    <ProfileToggle
      id="reminders-label"
      icon={AlarmClock}
      label={t("reminders")}
      onDescription={t("remindersOn")}
      offDescription={t("off")}
      initialOn={initialOn}
      save={(on) => updateProfile({ practice_reminders: on })}
    />
  );
}

/**
 * Le partage des sessions avec les amis : le choix par defaut de la case
 * « Partager avec mes amis » en fin de session. Chaque session peut encore
 * faire autrement.
 */
export function ShareSessionsSetting({ initialOn }: { initialOn: boolean }) {
  const t = useTranslations("profile.notifications");
  return (
    <ProfileToggle
      id="share-sessions-label"
      icon={Users}
      label={t("shareSessions")}
      onDescription={t("shareSessionsOn")}
      offDescription={t("shareSessionsOff")}
      initialOn={initialOn}
      save={(on) => updateProfile({ share_sessions: on })}
    />
  );
}

/**
 * Cote reception : etre prevenu quand un ami se met a jouer. C'est la
 * notification la plus frequente, on doit pouvoir la couper seule.
 */
export function FriendsPlayingSetting({ initialOn }: { initialOn: boolean }) {
  const t = useTranslations("profile.notifications");
  return (
    <ProfileToggle
      id="friends-playing-label"
      icon={Guitar}
      label={t("friendsPlaying")}
      onDescription={t("friendsPlayingOn")}
      offDescription={t("off")}
      initialOn={initialOn}
      save={(on) => updateProfile({ notify_friends_playing: on })}
    />
  );
}

/** Sessions planifiees : rappels, invitations et changements. */
export function PlannedRemindersSetting({ initialOn }: { initialOn: boolean }) {
  const t = useTranslations("profile.notifications");
  return (
    <ProfileToggle
      id="planned-label"
      icon={CalendarClock}
      label={t("planned")}
      onDescription={t("plannedOn")}
      offDescription={t("off")}
      initialOn={initialOn}
      save={(on) => updateProfile({ notify_planned: on })}
    />
  );
}

/** La relance du soir, quand une session planifiee n'a pas ete jouee. */
export function PlannedMissedSetting({ initialOn }: { initialOn: boolean }) {
  const t = useTranslations("profile.notifications");
  return (
    <ProfileToggle
      id="planned-missed-label"
      icon={Moon}
      label={t("plannedMissed")}
      onDescription={t("plannedMissedOn")}
      offDescription={t("off")}
      initialOn={initialOn}
      save={(on) => updateProfile({ notify_planned_missed: on })}
    />
  );
}

/** Repetes de tous mes groupes ; chaque groupe se coupe aussi a part. */
export function RehearsalsSetting({ initialOn }: { initialOn: boolean }) {
  const t = useTranslations("profile.notifications");
  return (
    <ProfileToggle
      id="rehearsals-label"
      icon={CalendarCheck}
      label={t("rehearsals")}
      onDescription={t("rehearsalsOn")}
      offDescription={t("off")}
      initialOn={initialOn}
      save={(on) => updateProfile({ notify_rehearsals: on })}
    />
  );
}
