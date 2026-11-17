"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, Copy, Download, Monitor } from "lucide-react";

type Platform = "ios" | "android";

/** Evenement non standard de Chrome / Android, absent des types du DOM. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface Detected {
  platform: Platform | null;
  standalone: boolean;
  /** iPhone, mais dans Chrome, Firefox ou le navigateur d'une autre appli. */
  iosNotSafari: boolean;
}

function detect(): Detected {
  const ua = navigator.userAgent;
  // iPadOS se presente comme un Mac : on le reconnait a l'ecran tactile.
  const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const iosNotSafari = ios && /CriOS|FxiOS|EdgiOS|OPiOS|GSA|FBAN|FBAV|Instagram|Line\//.test(ua);
  return { platform: ios ? "ios" : android ? "android" : null, standalone, iosNotSafari };
}

// Le telephone ne change pas pendant la visite : lu une fois, puis garde
// (useSyncExternalStore attend la meme reference a chaque lecture).
let cached: Detected | null = null;
const readDetected = () => (cached ??= detect());
const noopSubscribe = () => () => {};

const IOS_STEPS = ["safari", "dots", "share", "home", "add", "open", "notif"] as const;
const ANDROID_STEPS = ["chrome", "menu", "install", "notif"] as const;

interface Props {
  video: { src: string; poster: string };
}

export function InstallView({ video }: Props) {
  const t = useTranslations("install");
  // Le rendu serveur ne connait pas le telephone : null jusqu'au montage.
  const detected = useSyncExternalStore(noopSubscribe, readDetected, () => null);
  const [chosen, setTab] = useState<Platform | null>(null);
  const tab: Platform = chosen ?? detected?.platform ?? "ios";
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [copied, setCopied] = useState(false);
  const url = detected ? window.location.host : "";

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Presse-papiers refuse : le lien reste lisible a l'ecran.
    }
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  if (detected?.standalone) {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <p className="flex items-center gap-2 font-display text-3xl font-extrabold uppercase">
          <Check className="h-7 w-7 text-success" aria-hidden="true" />
          {t("installed.title")}
        </p>
        <p className="mt-2 text-muted-foreground">{t("installed.body")}</p>
        <Link
          href="/accueil"
          className="mt-5 inline-flex min-h-[48px] items-center rounded-xl bg-primary px-6 font-bold text-primary-foreground hover:opacity-90"
        >
          {t("installed.open")}
        </Link>
      </section>
    );
  }

  const steps = tab === "ios" ? IOS_STEPS : ANDROID_STEPS;

  return (
    <div className="space-y-10">
      {detected && !detected.platform ? (
        <section className="flex gap-4 rounded-xl border border-border bg-card p-5">
          <Monitor className="mt-0.5 h-6 w-6 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-semibold">{t("desktop.title")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("desktop.body")}</p>
            <p className="mt-3 break-all font-mono text-lg text-primary">{url}/installer</p>
          </div>
        </section>
      ) : null}

      {tab === "ios" && detected?.iosNotSafari ? (
        <section className="rounded-xl border border-primary bg-card p-5">
          <p className="font-semibold">{t("notSafari.title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("notSafari.body")}</p>
          <button
            type="button"
            onClick={copyLink}
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-input px-4 text-sm font-semibold hover:bg-accent"
          >
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? t("notSafari.copied") : t("notSafari.copy")}
          </button>
        </section>
      ) : null}

      <div>
        <div role="tablist" aria-label={t("tabs.label")} className="inline-flex rounded-xl border border-border p-1">
          {(["ios", "android"] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={tab === p}
              onClick={() => setTab(p)}
              className={`min-h-[40px] rounded-lg px-5 text-sm font-semibold transition-colors ${
                tab === p ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(`tabs.${p}`)}
            </button>
          ))}
        </div>
        {detected?.platform ? <p className="mt-2 text-xs text-muted-foreground">{t("detected")}</p> : null}
      </div>

      <div className={`grid gap-10 ${tab === "ios" ? "lg:grid-cols-[minmax(0,1fr)_320px]" : ""}`}>
        <section>
          <h2 className="font-display text-4xl font-extrabold uppercase leading-none">{t(`${tab}.title`)}</h2>

          {tab === "android" && installEvent ? (
            <div className="mt-6 rounded-xl border border-border bg-card p-5">
              <button
                type="button"
                onClick={install}
                className="inline-flex min-h-[52px] items-center gap-2 rounded-xl bg-primary px-7 font-bold text-primary-foreground hover:opacity-90"
              >
                <Download className="h-5 w-5" aria-hidden="true" />
                {t("android.button")}
              </button>
              <p className="mt-2 text-sm text-muted-foreground">{t("android.buttonHint")}</p>
            </div>
          ) : null}

          <ol className="mt-6 border-t border-border">
            {steps.map((step, i) => (
              <li key={step} className="flex gap-4 border-b border-border py-4">
                <span className="w-8 shrink-0 font-display text-3xl font-extrabold leading-none text-primary">{i + 1}</span>
                <div className="min-w-0">
                  <p className="font-semibold">{t(`${tab}.steps.${step}.title` as "ios.steps.safari.title")}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {t(`${tab}.steps.${step}.body` as "ios.steps.safari.body")}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {tab === "ios" ? (
          <figure className="mx-auto w-full max-w-[320px]">
            <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {t("video.label")}
            </p>
            <video
              src={video.src}
              poster={video.poster}
              controls
              playsInline
              preload="none"
              className="aspect-[9/16] w-full rounded-xl border border-border bg-muted"
            />
            <figcaption className="mt-2 text-sm text-muted-foreground">{t("video.caption")}</figcaption>
          </figure>
        ) : null}
      </div>
    </div>
  );
}
