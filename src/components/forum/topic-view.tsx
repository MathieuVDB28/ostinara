"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowBigUp, Bell, BellOff, CircleCheck, Flag, Lock, Pin } from "lucide-react";
import { profileHref } from "@/lib/navigation";
import { FORUM_CATEGORIES } from "@/lib/forum";
import { instrumentLabel } from "@/lib/instruments";
import {
  addForumReply,
  deleteForumReply,
  deleteForumTopic,
  getTopicFollowing,
  moderateReply,
  moderateTopic,
  reportForumContent,
  setSolvedReply,
  setTopicFollowing,
  toggleReplyVote,
  updateForumReply,
} from "@/lib/actions/forum";
import { Cover } from "@/components/ui/cover";
import { PlainText } from "./plain-text";
import { MentionTextarea } from "./mention-textarea";
import type { ForumAuthor, ForumCategory, ForumReply, ForumReportReason, ForumTopic } from "@/types";

interface Props {
  topic: ForumTopic;
  initialReplies: ForumReply[];
  viewer: { id: string | null; isStaff: boolean };
  context: "public" | "app";
  /** Les pseudos mentionnes qui existent (minuscules). */
  mentions: string[];
  /** Je suis le sujet (null : visiteur). */
  following: boolean | null;
}

const field =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";
const textButton =
  "inline-flex min-h-[32px] items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50";
const chip = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold";

const REPORT_REASONS: ForumReportReason[] = ["spam", "abuse", "off_topic", "other"];

function AuthorLine({
  author,
  date,
  edited,
  linkable,
}: {
  author: ForumAuthor | null;
  date: string;
  edited: boolean;
  linkable: boolean;
}) {
  const t = useTranslations("forum");
  const format = useFormatter();
  const name = author?.display_name || author?.username || t("deletedUser");
  return (
    <div className="flex items-center gap-2.5">
      {author?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={author.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="h-8 w-8 shrink-0 rounded-full bg-muted" />
      )}
      <p className="min-w-0 text-sm">
        {author && linkable ? (
          <Link href={profileHref(author.username)} className="font-semibold hover:underline">{name}</Link>
        ) : (
          <span className="font-semibold">{name}</span>
        )}
        {author?.staff_role && (
          <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
            {t("staff")}
          </span>
        )}
        <span className="ml-2 text-xs text-muted-foreground">
          {format.relativeTime(new Date(date))}
          {edited && ` · ${t("edited")}`}
        </span>
      </p>
    </div>
  );
}

/** Signaler un sujet ou une reponse : motif + precision, en place. */
function ReportForm({ onSend, onCancel }: { onSend: (reason: ForumReportReason, note: string) => void; onCancel: () => void }) {
  const t = useTranslations("forum.report");
  const [reason, setReason] = useState<ForumReportReason>("spam");
  const [note, setNote] = useState("");
  return (
    <div className="mt-2 space-y-2 rounded-xl border border-border p-3">
      <select value={reason} onChange={(e) => setReason(e.target.value as ForumReportReason)} className={field}>
        {REPORT_REASONS.map((value) => (
          <option key={value} value={value}>{t(`reason.${value}`)}</option>
        ))}
      </select>
      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={t("note")} className={field} />
      <div className="flex gap-3">
        <button type="button" onClick={() => onSend(reason, note)} className={textButton}>{t("send")}</button>
        <button type="button" onClick={onCancel} className={textButton}>{t("cancel")}</button>
      </div>
    </div>
  );
}

/**
 * Un sujet du forum et ses reponses.
 *
 * L'auteur du sujet choisit la meilleure reponse (affichee en tete) ; tout
 * membre vote pour les reponses des autres ; l'equipe epingle, verrouille,
 * masque et deplace. Un visiteur lit tout, et on l'invite a se connecter
 * pour repondre.
 */
export function TopicView({ topic: initialTopic, initialReplies, viewer, context, mentions, following: initialFollowing }: Props) {
  const t = useTranslations("forum");
  const te = useTranslations("enums");
  const router = useRouter();
  const [topic, setTopic] = useState(initialTopic);
  const [replies, setReplies] = useState(initialReplies);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [confirmDeleteTopic, setConfirmDeleteTopic] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mentionSet, setMentionSet] = useState<ReadonlySet<string>>(() => new Set(mentions));
  const [following, setFollowing] = useState(initialFollowing);

  function addMentions(names: string[] | undefined) {
    if (names?.length) setMentionSet((current) => new Set([...current, ...names]));
  }

  const signedIn = viewer.id !== null;
  const isAuthor = viewer.id === topic.author?.id;
  const linkable = context === "app";
  const solved = replies.find((reply) => reply.id === topic.solved_reply_id) ?? null;
  const listHref = context === "public" ? "/forum" : "/commu/forum";

  function run<T extends { success: boolean; error?: string }>(action: () => Promise<T>, onOk: (result: T) => void) {
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      if (result.success) onOk(result);
      else setNotice({ kind: "error", text: result.error ?? t("error") });
    });
  }

  function moderate(changes: Partial<Pick<ForumTopic, "is_pinned" | "is_locked" | "is_hidden">> & { category?: ForumCategory }) {
    run(() => moderateTopic(topic.id, changes), () => setTopic((current) => ({ ...current, ...changes })));
  }

  function report(target: { topicId?: string; replyId?: string }, reason: ForumReportReason, note: string) {
    run(
      () => reportForumContent({ ...target, reason, note }),
      () => {
        setReportingId(null);
        setNotice({ kind: "ok", text: t("report.thanks") });
      }
    );
  }

  function reply(event: React.FormEvent) {
    event.preventDefault();
    run(
      () => addForumReply(topic.id, draft),
      (result) => {
        setReplies((list) => [...list, result.reply!]);
        addMentions(result.mentions);
        setDraft("");
        // Repondre abonne au sujet, sauf desabonnement explicite : on relit
        getTopicFollowing(topic.id).then(setFollowing);
      }
    );
  }

  function vote(target: ForumReply) {
    run(
      () => toggleReplyVote(target.id),
      (result) =>
        setReplies((list) =>
          list.map((item) =>
            item.id === target.id
              ? { ...item, voted: result.voted, vote_count: item.vote_count + (result.voted ? 1 : -1) }
              : item
          )
        )
    );
  }

  function markSolved(replyId: string | null) {
    run(() => setSolvedReply(topic.id, replyId), () => setTopic((current) => ({ ...current, solved_reply_id: replyId })));
  }

  function renderReply(item: ForumReply, highlighted = false) {
    const mine = item.author?.id === viewer.id;
    const isSolution = item.id === topic.solved_reply_id;
    return (
      <article
        key={`${highlighted ? "best-" : ""}${item.id}`}
        id={highlighted ? undefined : `reponse-${item.id}`}
        className={`scroll-mt-24 space-y-2 py-4 ${highlighted ? "rounded-2xl border-2 border-primary px-4" : ""} ${
          item.is_hidden ? "opacity-60" : ""
        }`}
      >
        {(highlighted || isSolution) && (
          <p className="inline-flex items-center gap-1 text-xs font-bold text-primary">
            <CircleCheck className="h-4 w-4" /> {t("bestAnswer")}
          </p>
        )}
        {item.is_hidden && <p className="text-xs font-bold text-destructive">{t("hiddenReply")}</p>}
        <AuthorLine author={item.author} date={item.created_at} edited={item.edited_at !== null} linkable={linkable} />
        {editingId === item.id ? (
          <div className="space-y-2">
            <MentionTextarea value={editText} onChange={setEditText} topicId={topic.id} rows={5} maxLength={10000} className={field} />
            <div className="flex gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  run(
                    () => updateForumReply(item.id, editText),
                    (result) => {
                      setReplies((list) => list.map((r) => (r.id === item.id ? { ...result.reply!, voted: r.voted } : r)));
                      addMentions(result.mentions);
                      setEditingId(null);
                    }
                  )
                }
                className={textButton}
              >
                {t("save")}
              </button>
              <button type="button" onClick={() => setEditingId(null)} className={textButton}>{t("cancel")}</button>
            </div>
          </div>
        ) : (
          <PlainText text={item.body} mentions={mentionSet} linkMentions={linkable} className="text-[15px] leading-relaxed" />
        )}
        {!highlighted && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <button
              type="button"
              onClick={() => (signedIn ? vote(item) : router.push("/login"))}
              disabled={isPending || mine}
              aria-pressed={item.voted ?? false}
              title={mine ? t("cannotVoteOwn") : t("vote")}
              className={`inline-flex min-h-[32px] items-center gap-1 rounded-full border px-2.5 text-xs font-bold tabular-nums transition-colors disabled:opacity-60 ${
                item.voted ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"
              }`}
            >
              <ArrowBigUp className="h-4 w-4" /> {item.vote_count}
            </button>
            {isAuthor && !mine && !item.is_hidden && (
              <button type="button" disabled={isPending} onClick={() => markSolved(isSolution ? null : item.id)} className={textButton}>
                <CircleCheck className="h-3.5 w-3.5" />
                {isSolution ? t("unmarkSolution") : t("markSolution")}
              </button>
            )}
            {mine && editingId !== item.id && (
              <>
                <button type="button" onClick={() => { setEditingId(item.id); setEditText(item.body); }} className={textButton}>
                  {t("edit")}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => deleteForumReply(item.id), () => setReplies((list) => list.filter((r) => r.id !== item.id)))}
                  className={textButton}
                >
                  {t("delete")}
                </button>
              </>
            )}
            {viewer.isStaff && !mine && (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  run(() => moderateReply(item.id, !item.is_hidden), () =>
                    setReplies((list) => list.map((r) => (r.id === item.id ? { ...r, is_hidden: !r.is_hidden } : r)))
                  )
                }
                className={textButton}
              >
                {item.is_hidden ? t("moderation.show") : t("moderation.hide")}
              </button>
            )}
            {signedIn && !mine && (
              <button type="button" onClick={() => setReportingId(item.id)} className={textButton}>
                <Flag className="h-3.5 w-3.5" /> {t("report.action")}
              </button>
            )}
          </div>
        )}
        {reportingId === item.id && (
          <ReportForm onSend={(reason, note) => report({ replyId: item.id }, reason, note)} onCancel={() => setReportingId(null)} />
        )}
      </article>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={listHref} className="mb-4 inline-flex min-h-[36px] items-center text-sm font-semibold text-muted-foreground hover:text-foreground">
        ← {t("backToForum")}
      </Link>

      <header className="space-y-3">
        <p className="flex flex-wrap items-center gap-2">
          <span className={`${chip} bg-muted`}>{te(`forumCategory.${topic.category}`)}</span>
          {topic.instruments.map((instrument) => (
            <span key={instrument} className={`${chip} border border-border`}>{instrumentLabel({ instrument }, te)}</span>
          ))}
          {topic.solved_reply_id && (
            <span className={`${chip} bg-primary text-primary-foreground`}><CircleCheck className="h-3.5 w-3.5" /> {t("solved")}</span>
          )}
          {topic.is_pinned && <span className={`${chip} border border-border`}><Pin className="h-3.5 w-3.5" /> {t("pinned")}</span>}
          {topic.is_locked && <span className={`${chip} border border-border`}><Lock className="h-3.5 w-3.5" /> {t("locked")}</span>}
          {topic.is_hidden && <span className={`${chip} bg-destructive/10 text-destructive`}>{t("hidden")}</span>}
        </p>
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{topic.title}</h1>
        <AuthorLine author={topic.author} date={topic.created_at} edited={topic.edited_at !== null} linkable={linkable} />
      </header>

      <PlainText text={topic.body} mentions={mentionSet} linkMentions={linkable} className="mt-5 text-[15px] leading-relaxed" />

      {topic.images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {topic.images.map((url) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" loading="lazy" className="aspect-square w-full rounded-xl bg-muted object-cover" />
            </a>
          ))}
        </div>
      )}

      {topic.gear && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border p-3">
          <Cover src={topic.gear.image_url} className="h-14 w-14 rounded-lg" />
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
              {t("gear")} · {te(`gearType.${topic.gear.type}`)}
            </p>
            <p className="truncate font-semibold">{topic.gear.brand} {topic.gear.model}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[topic.gear.year, topic.gear.color].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {/* Actions sur le sujet */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-b border-border pb-3">
        {isAuthor && context === "app" && (
          <Link href={`/commu/forum/${topic.slug}/modifier`} className={textButton}>{t("edit")}</Link>
        )}
        {(isAuthor || viewer.isStaff) && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (!confirmDeleteTopic) return setConfirmDeleteTopic(true);
              run(() => deleteForumTopic(topic.id), () => router.push(listHref));
            }}
            className={`${textButton} ${confirmDeleteTopic ? "text-destructive" : ""}`}
          >
            {confirmDeleteTopic ? t("confirmDelete") : t("delete")}
          </button>
        )}
        {following !== null && (
          <button
            type="button"
            disabled={isPending}
            aria-pressed={following}
            title={t(following ? "unfollowHint" : "followHint")}
            onClick={() => run(() => setTopicFollowing(topic.id, !following), () => setFollowing(!following))}
            className={textButton}
          >
            {following ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
            {t(following ? "unfollow" : "follow")}
          </button>
        )}
        {signedIn && !isAuthor && (
          <button type="button" onClick={() => setReportingId(topic.id)} className={textButton}>
            <Flag className="h-3.5 w-3.5" /> {t("report.action")}
          </button>
        )}
      </div>
      {reportingId === topic.id && (
        <ReportForm onSend={(reason, note) => report({ topicId: topic.id }, reason, note)} onCancel={() => setReportingId(null)} />
      )}

      {viewer.isStaff && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-secondary p-2">
          <span className="px-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t("moderation.title")}
          </span>
          <button type="button" disabled={isPending} onClick={() => moderate({ is_pinned: !topic.is_pinned })} className={textButton}>
            {topic.is_pinned ? t("moderation.unpin") : t("moderation.pin")}
          </button>
          <button type="button" disabled={isPending} onClick={() => moderate({ is_locked: !topic.is_locked })} className={textButton}>
            {topic.is_locked ? t("moderation.unlock") : t("moderation.lock")}
          </button>
          <button type="button" disabled={isPending} onClick={() => moderate({ is_hidden: !topic.is_hidden })} className={textButton}>
            {topic.is_hidden ? t("moderation.show") : t("moderation.hide")}
          </button>
          <select
            value={topic.category}
            disabled={isPending}
            onChange={(e) => moderate({ category: e.target.value as ForumCategory })}
            aria-label={t("moderation.move")}
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
          >
            {FORUM_CATEGORIES.map((value) => (
              <option key={value} value={value}>{te(`forumCategory.${value}`)}</option>
            ))}
          </select>
        </div>
      )}

      {notice && (
        <p className={`mt-3 text-sm ${notice.kind === "error" ? "text-destructive" : "text-muted-foreground"}`}>{notice.text}</p>
      )}

      {/* Meilleure reponse, en tete */}
      {solved && <div className="mt-6">{renderReply(solved, true)}</div>}

      <section className="mt-6">
        <h2 className="mb-1 border-b border-border pb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("replies", { count: replies.filter((r) => !r.is_hidden).length })}
        </h2>
        {replies.length === 0 && <p className="py-3 text-sm text-muted-foreground">{t("noReplies")}</p>}
        <div className="divide-y divide-border">{replies.map((item) => renderReply(item))}</div>
      </section>

      <div className="mt-4 border-t border-border pt-4">
        {!signedIn ? (
          <p className="text-sm text-muted-foreground">
            {t.rich("signInToReply", {
              login: (chunks) => <Link href="/login" className="font-semibold text-primary hover:underline">{chunks}</Link>,
              register: (chunks) => <Link href="/register" className="font-semibold text-primary hover:underline">{chunks}</Link>,
            })}
          </p>
        ) : topic.is_locked && !viewer.isStaff ? (
          <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" /> {t("lockedHint")}
          </p>
        ) : (
          <form onSubmit={reply} className="space-y-2">
            <MentionTextarea
              value={draft}
              onChange={setDraft}
              topicId={topic.id}
              rows={5}
              maxLength={10000}
              placeholder={t("replyPlaceholder")}
              className={field}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPending || draft.trim().length < 2}
                className="inline-flex min-h-[42px] items-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {t("sendReply")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
