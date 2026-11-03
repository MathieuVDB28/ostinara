"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import { formatTimeAgo, summarizeSetlistChanges, type ChangesT } from "@/lib/setlist-changes";
import {
  getSetlistHistory,
  type SetlistHistoryAuthor,
  type SetlistHistoryBatch,
  type SetlistHistoryPage,
} from "@/lib/actions/setlists";

function authorName(author: SetlistHistoryAuthor | null, fallback: string): string {
  return author?.display_name || author?.username || fallback;
}

function useChangesT(): ChangesT {
  const t = useTranslations("setlists.changes");
  return (key, values) => t(key, values);
}

/**
 * « Modifiee par Lea il y a 2 h », sous le titre d'une setlist de groupe.
 * Rien tant que personne n'a touche a la setlist depuis sa creation.
 */
export function SetlistLastChange({ history }: { history: SetlistHistoryPage | null }) {
  const t = useTranslations("setlists.history");
  const intlLocale = useIntlLocale();
  const [now] = useState(() => Date.now());
  const last = history?.batches[0];
  if (!last) return null;

  return (
    <a href="#setlist-history" className="mt-2 inline-block text-xs text-muted-foreground hover:underline">
      {t("lastChange", {
        name: authorName(last.author, t("someone")),
        when: formatTimeAgo(last.at, intlLocale, now),
      })}
    </a>
  );
}

/** Les lots d'une page, recolles a ceux deja la (un lot peut etre a cheval). */
function mergeBatches(current: SetlistHistoryBatch[], next: SetlistHistoryBatch[]): SetlistHistoryBatch[] {
  const merged = current.map((batch) => ({ ...batch, changes: [...batch.changes] }));
  const byKey = new Map(merged.map((batch) => [batch.key, batch]));
  for (const batch of next) {
    const existing = byKey.get(batch.key);
    if (existing) existing.changes.push(...batch.changes);
    else {
      merged.push(batch);
      byKey.set(batch.key, batch);
    }
  }
  return merged;
}

const VISIBLE_STEP = 20;

/**
 * L'historique d'une setlist de groupe : qui a change quoi, par resume
 * (les memes lots que les notifications envoyees au groupe), et la creation
 * en dernier.
 */
export function SetlistHistory({
  setlistId,
  history,
}: {
  setlistId: string;
  history: SetlistHistoryPage | null;
}) {
  const t = useTranslations("setlists.history");
  const tChanges = useChangesT();
  const intlLocale = useIntlLocale();
  const [extra, setExtra] = useState<{ batches: SetlistHistoryBatch[]; cursor: string | null } | null>(null);
  const [visible, setVisible] = useState(VISIBLE_STEP);
  const [error, setError] = useState(false);
  const [loading, startLoading] = useTransition();
  const [now] = useState(() => Date.now());

  // La premiere page vient du serveur (et se rafraichit avec la page) ;
  // la suite, chargee ici, s'y recolle.
  const batches = useMemo(
    () => (extra ? mergeBatches(history?.batches ?? [], extra.batches) : history?.batches ?? []),
    [history, extra]
  );
  const cursor = extra ? extra.cursor : history?.nextCursor ?? null;

  if (!history) return null;
  if (batches.length === 0 && !history.created) return null;

  const shown = batches.slice(0, visible);
  const hasMore = batches.length > visible || cursor !== null;

  const showMore = () => {
    if (batches.length > visible + VISIBLE_STEP || !cursor) {
      setVisible((count) => count + VISIBLE_STEP);
      return;
    }
    setError(false);
    startLoading(async () => {
      const page = await getSetlistHistory(setlistId, cursor);
      if (!page) {
        setError(true);
        return;
      }
      setExtra((current) => ({
        batches: mergeBatches(current?.batches ?? [], page.batches),
        cursor: page.nextCursor,
      }));
      setVisible((count) => count + VISIBLE_STEP);
    });
  };

  return (
    <section id="setlist-history" className="mb-6 max-w-3xl scroll-mt-20">
      <h2 className="border-b border-border pb-2 font-display text-[13px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
        {t("title")}
      </h2>
      <ol>
        {shown.map((batch) => (
          <li key={batch.key} className="border-b border-border py-2.5">
            <p className="text-sm">
              <span className="font-semibold">{authorName(batch.author, t("someone"))}</span>{" "}
              <span className="text-muted-foreground">
                {summarizeSetlistChanges(batch.changes, tChanges, intlLocale) || t("nothing")}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {formatTimeAgo(batch.at, intlLocale, now)}
              {batch.pending && <> · {t("pending")}</>}
            </p>
          </li>
        ))}
        {!hasMore && history.created && (
          <li className="py-2.5">
            <p className="text-sm text-muted-foreground">
              {t("created", { name: authorName(history.created.author, t("someone")) })}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Intl.DateTimeFormat(intlLocale, { day: "numeric", month: "long", year: "numeric" }).format(
                new Date(history.created.at)
              )}
            </p>
          </li>
        )}
      </ol>
      {hasMore && (
        <button
          type="button"
          onClick={showMore}
          disabled={loading}
          className="mt-2 inline-flex min-h-[36px] items-center text-xs font-semibold text-foreground hover:underline disabled:opacity-50"
        >
          {loading ? t("loading") : t("more")}
        </button>
      )}
      {error && (
        <p role="status" className="mt-1 text-xs text-destructive">
          {t("loadFailed")}
        </p>
      )}
    </section>
  );
}
