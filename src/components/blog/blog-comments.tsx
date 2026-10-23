"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { profileHref } from "@/lib/navigation";
import {
  addBlogComment,
  deleteBlogComment,
  updateBlogComment,
} from "@/lib/actions/blog";
import type { BlogComment } from "@/types";

interface Props {
  postId: string;
  initial: BlogComment[];
  /** null = visiteur sans compte. */
  currentUserId: string | null;
  /** L'equipe supprime n'importe quel commentaire (moderation). */
  isStaff: boolean;
  /** Le chemin de l'article, pour revenir apres la connexion. */
  loginHref: string;
}

const field =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";
const textButton = "text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50";

export function BlogComments({ postId, initial, currentUserId, isStaff, loginHref }: Props) {
  const t = useTranslations("blog.comments");
  const format = useFormatter();
  const [comments, setComments] = useState(initial);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addBlogComment(postId, draft);
      if (result.success && result.comment) {
        setComments((list) => [...list, result.comment!]);
        setDraft("");
      } else setError(result.error ?? null);
    });
  }

  function saveEdit(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateBlogComment(id, editText);
      if (result.success && result.comment) {
        setComments((list) => list.map((c) => (c.id === id ? result.comment! : c)));
        setEditingId(null);
      } else setError(result.error ?? null);
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteBlogComment(id);
      if (result.success) setComments((list) => list.filter((c) => c.id !== id));
      else setError(result.error ?? null);
    });
  }

  return (
    <section id="commentaires" className="scroll-mt-24">
      <h2 className="mb-1 border-b border-border pb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {t("title", { count: comments.length })}
      </h2>

      {comments.length === 0 && (
        <p className="py-3 text-sm text-muted-foreground">{t("empty")}</p>
      )}

      <ul className="divide-y divide-border">
        {comments.map((comment) => {
          const mine = comment.user_id === currentUserId;
          const name = comment.user?.display_name || comment.user?.username || t("deletedUser");
          return (
            <li key={comment.id} className="flex gap-3 py-4">
              {comment.user?.avatar_url ? (
                <img src={comment.user.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="h-9 w-9 shrink-0 rounded-full bg-muted" />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm">
                  {comment.user && currentUserId ? (
                    <Link href={profileHref(comment.user.username)} className="font-semibold hover:underline">
                      {name}
                    </Link>
                  ) : (
                    <span className="font-semibold">{name}</span>
                  )}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {format.relativeTime(new Date(comment.created_at))}
                    {comment.edited_at && ` · ${t("edited")}`}
                  </span>
                </p>
                {editingId === comment.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      className={field}
                    />
                    <div className="flex gap-3">
                      <button type="button" onClick={() => saveEdit(comment.id)} disabled={isPending} className={textButton}>
                        {t("save")}
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className={textButton}>
                        {t("cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-line text-sm">{comment.content}</p>
                )}
                {(mine || isStaff) && editingId !== comment.id && (
                  <div className="flex gap-3 pt-0.5">
                    {mine && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(comment.id);
                          setEditText(comment.content);
                        }}
                        className={textButton}
                      >
                        {t("edit")}
                      </button>
                    )}
                    <button type="button" onClick={() => remove(comment.id)} disabled={isPending} className={textButton}>
                      {mine ? t("delete") : t("moderate")}
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {currentUserId ? (
        <form onSubmit={submit} className="space-y-2 border-t border-border pt-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder={t("placeholder")}
            className={field}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending || !draft.trim()}
              className="inline-flex min-h-[40px] items-center rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {t("send")}
            </button>
          </div>
        </form>
      ) : (
        <p className="border-t border-border pt-4 text-sm text-muted-foreground">
          {t.rich("signInToComment", {
            login: (chunks) => (
              <Link href={loginHref} className="font-semibold text-primary hover:underline">{chunks}</Link>
            ),
            register: (chunks) => (
              <Link href="/register" className="font-semibold text-primary hover:underline">{chunks}</Link>
            ),
          })}
        </p>
      )}

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </section>
  );
}
