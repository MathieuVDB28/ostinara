"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Cover } from "@/components/ui/cover";
import { ProUpsell } from "@/components/subscription/pro-upsell";
import { LiveChat } from "@/components/live/live-chat";
import { useIntlLocale } from "@/i18n/intl-locale";
import type { LiveSessionView as ViewData } from "@/lib/actions/live-sessions";
import { useLiveAudience, useLiveChat, useLiveSessionState } from "@/lib/hooks/use-live-session";
import {
  formatLiveElapsed,
  isLiveSessionOver,
  liveSessionElapsedMs,
  type LiveSessionHost,
} from "@/lib/live-session";
import type { Instrument } from "@/types";

function hostName(host: LiveSessionHost): string {
  return host.display_name || host.username;
}

function HostLine({ host, children }: { host: LiveSessionHost; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-display text-base font-extrabold text-muted-foreground">
        {host.avatar_url ? (
          <img src={host.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          hostName(host)[0].toUpperCase()
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-display text-2xl font-extrabold uppercase leading-none">{hostName(host)}</p>
        <div className="mt-1 text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

function LiveBadge({ paused }: { paused?: boolean }) {
  const t = useTranslations("live");
  return (
    <span className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-destructive">
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full bg-current ${paused ? "opacity-50" : "animate-pulse"}`}
      />
      {paused ? t("paused") : t("badge")}
    </span>
  );
}

function PlayLink() {
  const t = useTranslations("live");
  return (
    <Link
      href="/jouer"
      className="inline-flex min-h-[44px] items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
    >
      {t("playToo")}
    </Link>
  );
}

function EndedView({ host }: { host: LiveSessionHost }) {
  const t = useTranslations("live");
  return (
    <div className="space-y-4 py-8 text-center">
      <p className="font-display text-3xl font-extrabold uppercase leading-none">{t("ended.title")}</p>
      <p className="text-sm text-muted-foreground">{t("ended.body", { name: hostName(host) })}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <PlayLink />
        <Link
          href="/commu"
          className="inline-flex min-h-[44px] items-center rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-accent"
        >
          {t("ended.feed")}
        </Link>
      </div>
    </div>
  );
}

/** Free : qui joue, sur quoi, depuis quand. La page ne bouge pas. */
function SnapshotView({
  host,
  instrument,
  startedAt,
}: {
  host: LiveSessionHost;
  instrument: Instrument | null;
  startedAt: string;
}) {
  const t = useTranslations("live");
  const te = useTranslations("enums");
  const intlLocale = useIntlLocale();
  const time = new Date(startedAt).toLocaleTimeString(intlLocale, { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      <LiveBadge />
      <HostLine host={host}>
        <span suppressHydrationWarning>
          {instrument && instrument !== "other"
            ? t("snapshot.withInstrument", { instrument: te(`instrument.${instrument}`), time })
            : t("snapshot.since", { time })}
        </span>
      </HostLine>
      <ProUpsell feature={t("snapshot.upsellTitle")} description={t("snapshot.upsellBody")} />
      <PlayLink />
    </div>
  );
}

function Viewers({ viewers }: { viewers: LiveSessionHost[] }) {
  const t = useTranslations("live");
  return (
    <p className="text-sm text-muted-foreground">
      {t("watching", { count: viewers.length })}
      {viewers.length > 0 && <span> · {viewers.map(hostName).join(", ")}</span>}
    </p>
  );
}

/** Pro et Band : le chrono qui tourne, ce qui se joue, qui regarde, le chat. */
function DirectView({ view }: { view: Extract<ViewData, { kind: "live" }> }) {
  const t = useTranslations("live");
  const te = useTranslations("enums");
  const session = useLiveSessionState(view.session);
  const { messages, send } = useLiveChat(view.session.id, view.messages);
  const audience = useLiveAudience(view.session.id, view.viewer);
  const others = audience.filter((person) => person.id !== view.viewer.id);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (session.status !== "running") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [session.status]);

  if (isLiveSessionOver(session, now)) return <EndedView host={view.host} />;

  const paused = session.status === "paused";
  const instrument = session.instrument && session.instrument !== "other" ? te(`instrument.${session.instrument}`) : null;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <LiveBadge paused={paused} />
        <HostLine host={view.host}>{instrument ?? t("playing")}</HostLine>

        <p className="tabular font-display text-[min(24vw,7rem)] font-extrabold leading-none" aria-live="off" suppressHydrationWarning>
          {formatLiveElapsed(liveSessionElapsedMs(session, now))}
        </p>

        {session.song_title ? (
          <div className="flex items-center gap-3">
            <Cover src={session.song_cover_url} className="h-14 w-14 rounded-[4px]" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{session.song_title}</p>
              <p className="truncate text-sm text-muted-foreground">{session.song_artist}</p>
            </div>
          </div>
        ) : (
          <p className="font-semibold">
            {session.exercise_name ? t("exercise", { name: session.exercise_name }) : t("freePlay")}
          </p>
        )}

        {session.bpm !== null && (
          <p className="tabular font-display text-2xl font-bold text-primary">
            {session.bpm} <span className="text-base text-muted-foreground">BPM</span>
          </p>
        )}

        <Viewers viewers={others} />
      </div>

      <section aria-label={t("chat.title")} className="flex h-[26rem] flex-col border-t border-border pt-3 lg:h-[34rem] lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
        <h2 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("chat.title")}
        </h2>
        <LiveChat messages={messages} currentUserId={view.viewer.id} onSend={send} className="flex-1" />
      </section>
    </div>
  );
}

export function LiveSessionView({ view }: { view: ViewData }) {
  if (view.kind === "ended") return <EndedView host={view.host} />;
  if (view.kind === "snapshot") {
    return <SnapshotView host={view.host} instrument={view.instrument} startedAt={view.startedAt} />;
  }
  return <DirectView view={view} />;
}
