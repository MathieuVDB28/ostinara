"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { setBandPublicPage } from "@/lib/actions/band-public";
import { siteUrl } from "@/lib/blog/categories";
import { bandPublicHref, normalizeSlugInput } from "@/lib/concerts";

const SECTION_TITLE =
  "font-display text-[13px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground";

interface BandPublicPageCardProps {
  bandId: string;
  slug: string;
  visible: boolean;
  /** Titulaire ou admin. */
  canManage: boolean;
  readOnly: boolean;
}

/** La page publique du groupe : son adresse, et de quoi la masquer ou la renommer. */
export function BandPublicPageCard({ bandId, slug, visible, canManage, readOnly }: BandPublicPageCardProps) {
  const t = useTranslations("bandPublic.card");
  const router = useRouter();
  const origin = siteUrl();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(slug);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const online = visible && !readOnly;
  const href = bandPublicHref(slug);
  const editable = canManage && !readOnly;

  const save = async (input: { visible?: boolean; slug?: string }) => {
    setBusy(true);
    setError(null);
    const result = await setBandPublicPage(bandId, input);
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? null);
      return false;
    }
    router.refresh();
    return true;
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${origin}${href}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // presse-papiers refuse : le lien reste affiche
    }
  };

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <h2 className={SECTION_TITLE}>{t("title")}</h2>
        <span className={`text-xs font-semibold ${online ? "text-foreground" : "text-muted-foreground"}`}>
          {online ? t("online") : t("hidden")}
        </span>
      </div>

      <p className="pt-3 text-sm text-muted-foreground">
        {readOnly ? t("readOnlyHint") : online ? t("onlineHint") : t("hiddenHint")}
      </p>

      {editing ? (
        <div className="mt-3">
          <label htmlFor="band-slug" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t("address")}
          </label>
          <div className="mt-1 flex items-center gap-1 rounded-xl border border-input bg-background px-3 focus-within:border-primary">
            <span className="shrink-0 text-sm text-muted-foreground">/groupe/</span>
            <input
              id="band-slug"
              value={draft}
              onChange={(event) => setDraft(normalizeSlugInput(event.target.value))}
              maxLength={60}
              autoComplete="off"
              className="min-h-[44px] min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t("addressHint")}</p>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft(slug);
                setError(null);
              }}
              className="min-h-[40px] rounded-full px-4 text-sm font-semibold hover:bg-accent"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              disabled={busy || draft.replace(/-+$/, "") === slug || draft.length < 3}
              onClick={async () => {
                if (await save({ slug: draft })) setEditing(false);
              }}
              className="min-h-[40px] rounded-full bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-40"
            >
              {t("save")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="min-w-0 max-w-full truncate rounded-lg bg-secondary px-2.5 py-1.5 font-mono text-[12.5px]">
            {origin.replace(/^https?:\/\//, "")}
            {href}
          </span>
          {online && (
            <>
              <button
                type="button"
                onClick={() => void copy()}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-border px-3 text-[13px] font-semibold hover:bg-accent"
              >
                <Icon name={copied ? "check" : "link"} className="h-4 w-4" />
                {copied ? t("copied") : t("copy")}
              </button>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-border px-3 text-[13px] font-semibold hover:bg-accent"
              >
                <Icon name="open_in_new" className="h-4 w-4" />
                {t("open")}
              </a>
            </>
          )}
        </div>
      )}

      {editable && !editing && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save({ visible: !visible })}
            className="text-sm font-semibold hover:underline disabled:opacity-40"
          >
            {visible ? t("hide") : t("show")}
          </button>
          <button type="button" onClick={() => setEditing(true)} className="text-sm font-semibold hover:underline">
            {t("changeAddress")}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
    </section>
  );
}

/**
 * Une fois par personne et par groupe (memorise dans le navigateur) : le
 * groupe a maintenant une page publique.
 */
export function BandPublicPageIntro({ bandId, slug, canManage }: { bandId: string; slug: string; canManage: boolean }) {
  const t = useTranslations("bandPublic.intro");
  const key = `band-public-page-intro:${bandId}`;
  const [dismissed, setDismissed] = useState(false);
  // Lu dans le navigateur ; cote serveur, rien a montrer.
  const seen = useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        return window.localStorage.getItem(key) === "seen";
      } catch {
        return true;
      }
    },
    () => true
  );

  if (seen || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(key, "seen");
    } catch {
      // stockage indisponible : le bandeau reviendra
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
      <Icon name="group" className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{t("title")}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{canManage ? t("bodyAdmin") : t("bodyMember")}</p>
        <a href={bandPublicHref(slug)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm font-semibold hover:underline">
          {t("see")}
        </a>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("dismiss")}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Icon name="close" className="h-4 w-4" />
      </button>
    </div>
  );
}

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}
