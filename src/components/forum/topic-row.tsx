import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { CircleCheck, Lock, MessageCircle, Pin } from "lucide-react";
import type { ForumTopicSummary } from "@/types";

interface Props {
  topic: ForumTopicSummary;
  href: string;
}

/** Un sujet dans la liste : etat, titre, rubrique, auteur, reponses. */
export function TopicRow({ topic, href }: Props) {
  const t = useTranslations("forum");
  const te = useTranslations("enums");
  const format = useFormatter();
  const author = topic.author?.display_name || topic.author?.username;
  const solved = topic.solved_reply_id !== null;

  return (
    <li>
      <Link href={href} className="flex gap-3 py-3.5 transition-colors hover:bg-accent/40 sm:px-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {topic.is_pinned && (
              <span className="inline-flex items-center gap-1 text-primary">
                <Pin className="h-3 w-3" /> {t("pinned")}
              </span>
            )}
            <span>{te(`forumCategory.${topic.category}`)}</span>
            {topic.is_locked && (
              <span className="inline-flex items-center gap-1">
                <Lock className="h-3 w-3" /> {t("locked")}
              </span>
            )}
            {topic.is_hidden && <span className="text-destructive">{t("hidden")}</span>}
          </p>
          <p className="font-semibold leading-snug">
            {solved && (
              <CircleCheck className="mr-1.5 inline h-4 w-4 align-[-2px] text-primary" aria-label={t("solved")} />
            )}
            {topic.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {[author, format.relativeTime(new Date(topic.last_activity_at))].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div
          className={`flex w-12 shrink-0 flex-col items-center justify-center rounded-xl text-xs font-bold tabular-nums ${
            topic.reply_count === 0 ? "text-muted-foreground" : solved ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
          aria-label={t("replies", { count: topic.reply_count })}
        >
          <MessageCircle className="mb-0.5 h-3.5 w-3.5" aria-hidden="true" />
          {topic.reply_count}
        </div>
      </Link>
    </li>
  );
}
