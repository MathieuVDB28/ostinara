"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { forumTopicAppHref } from "@/lib/forum";
import { moderateReply, moderateTopic, resolveForumReport } from "@/lib/actions/forum";
import { EmptyState } from "@/components/ui/empty-state";
import type { ForumReport } from "@/types";

const smallButton =
  "inline-flex min-h-[36px] items-center rounded-full border border-border px-3 text-xs font-bold transition-colors hover:bg-accent disabled:opacity-50";

/**
 * Les signalements en attente (equipe). Pour chacun : masquer le contenu
 * (et classer), ou classer sans suite.
 */
export function ModerationView({ initialReports }: { initialReports: ForumReport[] }) {
  const t = useTranslations("forum.moderationQueue");
  const tr = useTranslations("forum.report");
  const format = useFormatter();
  const [reports, setReports] = useState(initialReports);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handle(report: ForumReport, hide: boolean) {
    setError(null);
    startTransition(async () => {
      if (hide) {
        const hidden = report.topic
          ? await moderateTopic(report.topic.id, { is_hidden: true })
          : await moderateReply(report.reply!.id, true);
        if (!hidden.success) return setError(hidden.error ?? null);
      }
      const result = await resolveForumReport(report.id);
      if (!result.success) return setError(result.error ?? null);
      setReports((list) => list.filter((item) => item.id !== report.id));
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/commu/forum" className="inline-flex min-h-[36px] items-center text-sm font-semibold text-muted-foreground hover:text-foreground">
        ← {t("back")}
      </Link>
      <h1 className="font-display text-4xl font-extrabold uppercase leading-none">{t("title")}</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {reports.length === 0 ? (
        <EmptyState icon="check_circle" title={t("empty.title")} description={t("empty.body")} />
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {reports.map((report) => {
            const slug = report.topic?.slug ?? report.reply?.topic?.slug;
            const title = report.topic?.title ?? report.reply?.topic?.title;
            const body = report.topic?.body ?? report.reply?.body ?? "";
            const alreadyHidden = report.topic?.is_hidden ?? report.reply?.is_hidden ?? false;
            return (
              <li key={report.id} className="space-y-2 py-4">
                <p className="text-xs text-muted-foreground">
                  <span className="font-bold text-destructive">{tr(`reason.${report.reason}`)}</span>
                  {" · "}
                  {t(report.topic ? "onTopic" : "onReply")}
                  {" · "}
                  {report.reporter?.display_name || report.reporter?.username}
                  {" · "}
                  {format.relativeTime(new Date(report.created_at))}
                </p>
                {report.note && <p className="text-sm italic">« {report.note} »</p>}
                {slug && (
                  <Link
                    href={`${forumTopicAppHref(slug)}${report.reply ? `#reponse-${report.reply.id}` : ""}`}
                    className="block font-semibold hover:underline"
                  >
                    {title}
                  </Link>
                )}
                <p className="line-clamp-4 whitespace-pre-line rounded-xl bg-muted p-3 text-sm">{body}</p>
                <div className="flex flex-wrap gap-2">
                  {!alreadyHidden && (
                    <button type="button" disabled={isPending} onClick={() => handle(report, true)} className={`${smallButton} text-destructive`}>
                      {t("hide")}
                    </button>
                  )}
                  <button type="button" disabled={isPending} onClick={() => handle(report, false)} className={smallButton}>
                    {t("dismiss")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
