"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { useIntlLocale } from "@/i18n/intl-locale";
import {
  addRecordingComment,
  deleteBandRecording,
  deleteRecordingComment,
  updateRecordingComment,
} from "@/lib/actions/band-recordings";
import {
  BAND_RECORDING_COMMENT_MAX,
  bandRecordingsHref,
  formatRecordingTime,
  parseRecordingTime,
} from "@/lib/band-recordings";
import { bandSongHref } from "@/lib/band-songs";
import { EditRecordingForm } from "./edit-recording-form";
import type { BandRecordingComment, BandRecordingDetails } from "@/types";

interface RecordingDetailViewProps {
  bandId: string;
  bandName: string;
  details: BandRecordingDetails;
  currentUserId: string;
  readOnly: boolean;
}

const SECTION_TITLE =
  "border-b border-border pb-2 font-display text-[13px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground";

function authorName(comment: { author: BandRecordingComment["author"] }, fallback: string) {
  return comment.author?.display_name || comment.author?.username || fallback;
}

/** Un enregistrement : le lecteur, les reperes des commentaires sur la barre, et le fil. */
export function RecordingDetailView({ bandId, bandName, details, currentUserId, readOnly }: RecordingDetailViewProps) {
  const t = useTranslations("recordings");
  const td = useTranslations("recordings.detail");
  const locale = useIntlLocale();
  const router = useRouter();
  const { recording, downloadUrl, canModerate } = details;
  // Le lien signe change a chaque rendu serveur : le lecteur garde le premier,
  // sinon il repartirait de zero apres chaque modification.
  const [mediaUrl] = useState(details.mediaUrl);
  // Les commentaires vivent ici : chaque geste les met a jour sans recharger la page.
  const [comments, setComments] = useState(details.comments);

  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState<number>(recording.duration_seconds ?? 0);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthor = recording.user_id === currentUserId;
  const canDelete = isAuthor || (canModerate && !readOnly);
  const author = recording.author?.display_name || recording.author?.username || t("someone");

  const threads = useMemo(() => {
    const roots = comments
      .filter((comment) => !comment.parent_id)
      .sort((a, b) => (a.start_seconds ?? 0) - (b.start_seconds ?? 0) || a.created_at.localeCompare(b.created_at));
    return roots.map((root) => ({
      root,
      replies: comments
        .filter((comment) => comment.parent_id === root.id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    }));
  }, [comments]);

  const addComment = useCallback((comment: BandRecordingComment) => {
    setComments((current) => [...current, comment]);
  }, []);
  const patchComment = useCallback((id: string, patch: Partial<BandRecordingComment>) => {
    setComments((current) => current.map((comment) => (comment.id === id ? { ...comment, ...patch } : comment)));
  }, []);
  const dropComment = useCallback((id: string) => {
    setComments((current) => current.filter((comment) => comment.id !== id && comment.parent_id !== id));
  }, []);

  const seek = useCallback((seconds: number) => {
    const media = mediaRef.current;
    if (!media) return;
    media.currentTime = seconds;
    void media.play().catch(() => undefined);
  }, []);

  // Ouvert depuis une notification : on descend jusqu'au commentaire.
  useEffect(() => {
    if (!window.location.hash.startsWith("#comment-")) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "center" });
  }, []);

  const removeRecording = async () => {
    if (!window.confirm(td("deleteConfirm"))) return;
    setDeleting(true);
    const result = await deleteBandRecording(recording.id);
    if (!result.success) {
      setError(result.error ?? null);
      setDeleting(false);
      return;
    }
    router.push(bandRecordingsHref(bandId));
  };

  const mediaProps = {
    ref: (element: HTMLMediaElement | null) => {
      mediaRef.current = element;
    },
    src: mediaUrl ?? undefined,
    controls: true,
    preload: "metadata" as const,
    onTimeUpdate: (event: React.SyntheticEvent<HTMLMediaElement>) => setCurrent(event.currentTarget.currentTime),
    onLoadedMetadata: (event: React.SyntheticEvent<HTMLMediaElement>) => {
      const value = event.currentTarget.duration;
      if (Number.isFinite(value) && value > 0) setDuration(value);
    },
  };

  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(recording.created_at)
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href={bandRecordingsHref(bandId)}
          className="-ml-1 mb-3 inline-flex min-h-[36px] items-center gap-1 rounded-lg px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon name="chevron_left" className="h-4 w-4" strokeWidth={2.25} />
          {t("title")} · {bandName}
        </Link>

        {editing ? (
          <EditRecordingForm
            bandId={bandId}
            recording={recording}
            onDone={() => {
              setEditing(false);
              router.refresh();
            }}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {t(`kinds.${recording.kind}`)}
              </span>
              <span className="text-xs text-muted-foreground">
                {[t("by", { name: author }), date, recording.duration_seconds !== null ? formatRecordingTime(recording.duration_seconds) : null]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            <h1 className="mt-2 font-display text-[36px] font-extrabold uppercase leading-[0.92] [overflow-wrap:anywhere]">
              {recording.title}
            </h1>
            {(recording.band_song || recording.rehearsal) && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {recording.band_song && (
                  <Link href={bandSongHref(bandId, recording.band_song.id)} className="font-semibold hover:underline">
                    {td("song", { title: recording.band_song.title })}
                  </Link>
                )}
                {recording.rehearsal && (
                  <Link href={`/setlists/rehearsals/${recording.rehearsal.id}`} className="font-semibold hover:underline">
                    {td("rehearsal", {
                      title:
                        recording.rehearsal.title ||
                        new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(recording.rehearsal.date)),
                    })}
                  </Link>
                )}
              </div>
            )}
            {recording.note && <p className="mt-3 whitespace-pre-line text-sm">{recording.note}</p>}

            <div className="mt-3 flex flex-wrap gap-2">
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-border px-3 text-[13px] font-semibold hover:bg-accent"
                >
                  <Icon name="download" className="h-4 w-4" />
                  {td("download")}
                </a>
              )}
              {isAuthor && !readOnly && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-border px-3 text-[13px] font-semibold hover:bg-accent"
                >
                  <Icon name="edit" className="h-4 w-4" />
                  {td("edit")}
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => void removeRecording()}
                  disabled={deleting}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-border px-3 text-[13px] font-semibold text-destructive hover:bg-accent disabled:opacity-40"
                >
                  <Icon name="delete" className="h-4 w-4" />
                  {td("delete")}
                </button>
              )}
            </div>
            {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
          </>
        )}
      </div>

      <div>
        {mediaUrl ? (
          recording.media_type === "video" ? (
            <video {...mediaProps} playsInline className="w-full rounded-xl bg-black" />
          ) : (
            <audio {...mediaProps} className="w-full" />
          )
        ) : (
          <p className="text-sm text-muted-foreground">{td("unavailable")}</p>
        )}
        <CommentTimeline
          duration={duration}
          current={current}
          comments={threads.map((thread) => thread.root)}
          onSeek={seek}
          label={td("markers")}
          jumpLabel={(time) => td("jumpTo", { time })}
        />
      </div>

      <section>
        <h2 className={SECTION_TITLE}>
          {td("commentsTitle")}
          {threads.length > 0 && <span className="tabular"> · {threads.length}</span>}
        </h2>

        {!readOnly && (
          <CommentComposer
            recordingId={recording.id}
            current={current}
            duration={duration}
            onDone={addComment}
          />
        )}

        {threads.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{td("noComments")}</p>
        ) : (
          <ul className="mt-2">
            {threads.map(({ root, replies }) => {
              const end = root.end_seconds ?? (root.start_seconds ?? 0) + 3;
              const active = current >= (root.start_seconds ?? 0) && current <= end;
              return (
                <li
                  key={root.id}
                  id={`comment-${root.id}`}
                  className={`scroll-mt-24 border-b border-border py-3 ${active ? "bg-accent/40" : ""}`}
                >
                  <CommentItem
                    comment={root}
                    currentUserId={currentUserId}
                    canModerate={canModerate}
                    readOnly={readOnly}
                    current={current}
                    duration={duration}
                    onSeek={seek}
                    onUpdated={patchComment}
                    onDeleted={dropComment}
                  />
                  {replies.length > 0 && (
                    <ul className="ml-6 mt-2 space-y-2 border-l border-border pl-3">
                      {replies.map((reply) => (
                        <li key={reply.id}>
                          <CommentItem
                            comment={reply}
                            currentUserId={currentUserId}
                            canModerate={canModerate}
                            readOnly={readOnly}
                            current={current}
                            duration={duration}
                            onSeek={seek}
                            onUpdated={patchComment}
                            onDeleted={dropComment}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                  {!readOnly && <ReplyComposer recordingId={recording.id} parentId={root.id} onDone={addComment} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/** La barre des reperes : un trait par moment, une zone par passage, la position de lecture. */
function CommentTimeline({
  duration,
  current,
  comments,
  onSeek,
  label,
  jumpLabel,
}: {
  duration: number;
  current: number;
  comments: BandRecordingComment[];
  onSeek: (seconds: number) => void;
  label: string;
  jumpLabel: (time: string) => string;
}) {
  if (duration <= 0 || comments.length === 0) return null;
  const pct = (seconds: number) => `${Math.min(100, Math.max(0, (seconds / duration) * 100))}%`;

  return (
    <div className="relative mt-3 h-6" role="group" aria-label={label}>
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
      <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary/40" style={{ width: pct(current) }} />
      {comments.map((comment) => {
        const start = comment.start_seconds ?? 0;
        const time = formatRecordingTime(start);
        return comment.end_seconds !== null ? (
          <button
            key={comment.id}
            type="button"
            onClick={() => onSeek(start)}
            aria-label={jumpLabel(time)}
            title={time}
            className="absolute top-1/2 h-3 -translate-y-1/2 rounded-sm bg-primary/50 hover:bg-primary"
            style={{ left: pct(start), width: `calc(${pct(comment.end_seconds)} - ${pct(start)})`, minWidth: "6px" }}
          />
        ) : (
          <button
            key={comment.id}
            type="button"
            onClick={() => onSeek(start)}
            aria-label={jumpLabel(time)}
            title={time}
            className="absolute top-0 h-6 w-3 -translate-x-1/2 after:absolute after:left-1/2 after:top-1 after:h-4 after:w-[3px] after:-translate-x-1/2 after:rounded-full after:bg-primary hover:after:bg-foreground"
            style={{ left: pct(start) }}
          />
        );
      })}
    </div>
  );
}

/** « 1:42 » ↔ secondes, avec un bouton qui prend le moment de lecture. */
function TimeField({
  id,
  label,
  value,
  onChange,
  onNow,
  nowLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onNow: () => void;
  nowLabel: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="numeric"
        className="min-h-[36px] w-20 rounded-lg border border-input bg-background px-2 text-sm tabular focus:border-primary"
      />
      <button
        type="button"
        onClick={onNow}
        aria-label={nowLabel}
        title={nowLabel}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Icon name="schedule" className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Ecrire un commentaire : le moment suit la lecture tant qu'on n'y touche pas. */
function CommentComposer({
  recordingId,
  current,
  duration,
  onDone,
}: {
  recordingId: string;
  current: number;
  duration: number;
  onDone: (comment: BandRecordingComment) => void;
}) {
  const td = useTranslations("recordings.detail");
  const [content, setContent] = useState("");
  const [startText, setStartText] = useState<string | null>(null);
  const [passage, setPassage] = useState(false);
  const [endText, setEndText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = startText ?? formatRecordingTime(current);

  const send = async () => {
    const startSeconds = parseRecordingTime(start);
    const endSeconds = passage ? parseRecordingTime(endText) : null;
    if (
      startSeconds === null ||
      (passage && (endSeconds === null || endSeconds <= startSeconds)) ||
      (duration > 0 && startSeconds > duration + 1)
    ) {
      setError(td("timeInvalid"));
      return;
    }
    setSending(true);
    setError(null);
    const result = await addRecordingComment({ recordingId, content, startSeconds, endSeconds });
    setSending(false);
    if (!result.success || !result.comment) {
      setError(result.error ?? null);
      return;
    }
    setContent("");
    setStartText(null);
    setPassage(false);
    setEndText("");
    onDone(result.comment);
  };

  return (
    <div className="mt-3 rounded-xl border border-border p-3">
      <label htmlFor="recording-comment" className="text-sm font-semibold">
        {td("commentLabel", { time: start })}
      </label>
      <textarea
        id="recording-comment"
        value={content}
        maxLength={BAND_RECORDING_COMMENT_MAX}
        onChange={(event) => setContent(event.target.value)}
        // Le moment se fige quand on commence a ecrire.
        onFocus={() => setStartText((value) => value ?? formatRecordingTime(current))}
        placeholder={td("commentPlaceholder")}
        rows={2}
        className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary"
      />
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <TimeField
          id="recording-comment-start"
          label={td("from")}
          value={start}
          onChange={setStartText}
          onNow={() => setStartText(formatRecordingTime(current))}
          nowLabel={td("now")}
        />
        <label className="inline-flex min-h-[36px] items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={passage}
            onChange={(event) => {
              setPassage(event.target.checked);
              if (event.target.checked && !endText) setEndText(formatRecordingTime(current));
            }}
            className="h-4 w-4"
          />
          {td("passage")}
        </label>
        {passage && (
          <TimeField
            id="recording-comment-end"
            label={td("to")}
            value={endText}
            onChange={setEndText}
            onNow={() => setEndText(formatRecordingTime(current))}
            nowLabel={td("now")}
          />
        )}
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || !content.trim()}
          className="ml-auto min-h-[40px] rounded-full bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-40"
        >
          {td("send")}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}

function ReplyComposer({
  recordingId,
  parentId,
  onDone,
}: {
  recordingId: string;
  parentId: string;
  onDone: (comment: BandRecordingComment) => void;
}) {
  const td = useTranslations("recordings.detail");
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-6 mt-1 inline-flex min-h-[32px] items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <Icon name="reply" className="h-3.5 w-3.5" />
        {td("reply")}
      </button>
    );
  }

  const send = async () => {
    setSending(true);
    setError(null);
    const result = await addRecordingComment({ recordingId, parentId, content });
    setSending(false);
    if (!result.success || !result.comment) {
      setError(result.error ?? null);
      return;
    }
    setContent("");
    setOpen(false);
    onDone(result.comment);
  };

  return (
    <div className="ml-6 mt-2">
      <textarea
        value={content}
        autoFocus
        maxLength={BAND_RECORDING_COMMENT_MAX}
        onChange={(event) => setContent(event.target.value)}
        placeholder={td("replyPlaceholder")}
        aria-label={td("replyPlaceholder")}
        rows={2}
        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary"
      />
      <div className="mt-1 flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="min-h-[36px] rounded-full px-3 text-sm font-semibold hover:bg-accent">
          {td("cancel")}
        </button>
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || !content.trim()}
          className="min-h-[36px] rounded-full bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-40"
        >
          {td("reply")}
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}

function CommentItem({
  comment,
  currentUserId,
  canModerate,
  readOnly,
  current,
  duration,
  onSeek,
  onUpdated,
  onDeleted,
}: {
  comment: BandRecordingComment;
  currentUserId: string;
  canModerate: boolean;
  readOnly: boolean;
  current: number;
  duration: number;
  onSeek: (seconds: number) => void;
  onUpdated: (id: string, patch: Partial<BandRecordingComment>) => void;
  onDeleted: (id: string) => void;
}) {
  const t = useTranslations("recordings");
  const td = useTranslations("recordings.detail");
  const mine = comment.user_id === currentUserId;
  const isReply = Boolean(comment.parent_id);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(comment.content);
  const [startText, setStartText] = useState(formatRecordingTime(comment.start_seconds));
  const [endText, setEndText] = useState(comment.end_seconds !== null ? formatRecordingTime(comment.end_seconds) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = mine && !readOnly;
  const canDelete = mine || (canModerate && !readOnly);
  const edited = new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime() > 2000;

  const save = async () => {
    let startSeconds: number | undefined;
    let endSeconds: number | null | undefined;
    if (!isReply) {
      const start = parseRecordingTime(startText);
      const end = endText.trim() ? parseRecordingTime(endText) : null;
      if (start === null || (endText.trim() && (end === null || end <= start)) || (duration > 0 && start > duration + 1)) {
        setError(td("timeInvalid"));
        return;
      }
      startSeconds = start;
      endSeconds = end;
    }
    setBusy(true);
    setError(null);
    const result = await updateRecordingComment(comment.id, { content, startSeconds, endSeconds });
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? null);
      return;
    }
    setEditing(false);
    onUpdated(comment.id, {
      content: content.trim(),
      updated_at: new Date().toISOString(),
      ...(isReply ? {} : { start_seconds: startSeconds ?? null, end_seconds: endSeconds ?? null }),
    });
  };

  const remove = async () => {
    if (!window.confirm(td("deleteCommentConfirm"))) return;
    setBusy(true);
    const result = await deleteRecordingComment(comment.id);
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? null);
      return;
    }
    onDeleted(comment.id);
  };

  return (
    <div className="flex gap-3">
      {!isReply && (
        <button
          type="button"
          onClick={() => onSeek(comment.start_seconds ?? 0)}
          aria-label={td("jumpTo", { time: formatRecordingTime(comment.start_seconds) })}
          className="h-fit shrink-0 rounded-md border border-border px-1.5 py-0.5 text-xs font-semibold tabular hover:bg-accent"
        >
          {formatRecordingTime(comment.start_seconds)}
          {comment.end_seconds !== null && `–${formatRecordingTime(comment.end_seconds)}`}
        </button>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{authorName(comment, t("someone"))}</span>
          {edited && <> · {td("edited")}</>}
        </p>
        {editing ? (
          <div className="mt-1">
            <textarea
              value={content}
              maxLength={BAND_RECORDING_COMMENT_MAX}
              onChange={(event) => setContent(event.target.value)}
              aria-label={td("editComment")}
              rows={2}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary"
            />
            {!isReply && (
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2">
                <TimeField
                  id={`edit-start-${comment.id}`}
                  label={td("from")}
                  value={startText}
                  onChange={setStartText}
                  onNow={() => setStartText(formatRecordingTime(current))}
                  nowLabel={td("now")}
                />
                <TimeField
                  id={`edit-end-${comment.id}`}
                  label={td("to")}
                  value={endText}
                  onChange={setEndText}
                  onNow={() => setEndText(formatRecordingTime(current))}
                  nowLabel={td("now")}
                />
              </div>
            )}
            <div className="mt-1 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(false)} className="min-h-[36px] rounded-full px-3 text-sm font-semibold hover:bg-accent">
                {td("cancel")}
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy || !content.trim()}
                className="min-h-[36px] rounded-full bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-40"
              >
                {td("save")}
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 whitespace-pre-line text-sm [overflow-wrap:anywhere]">{comment.content}</p>
        )}
        {!editing && (canEdit || canDelete) && (
          <div className="mt-1 flex gap-3">
            {canEdit && (
              <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
                {td("editComment")}
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => void remove()}
                disabled={busy}
                className="text-xs font-semibold text-muted-foreground hover:text-destructive disabled:opacity-40"
              >
                {td("deleteComment")}
              </button>
            )}
          </div>
        )}
        {error && <p className="mt-1 text-sm text-destructive" role="alert">{error}</p>}
      </div>
    </div>
  );
}
