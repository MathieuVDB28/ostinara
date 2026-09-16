"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { addComment, deleteComment, getActivityComments } from "@/lib/actions/activities";
import type { ActivityCommentWithProfile } from "@/types";

interface ActivityCommentsProps {
  activityId: string;
  commentCount: number;
  currentUserId: string;
}

export function ActivityComments({
  activityId,
  commentCount,
  currentUserId,
}: ActivityCommentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [comments, setComments] = useState<ActivityCommentWithProfile[]>([]);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [count, setCount] = useState(commentCount);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, startSending] = useTransition();

  const loadComments = async () => {
    if (loadedOnce) return;
    setIsLoading(true);
    const data = await getActivityComments(activityId);
    setComments(data);
    setCount(data.length);
    setLoadedOnce(true);
    setIsLoading(false);
  };

  const handleToggle = () => {
    const willOpen = !isOpen;
    setIsOpen(willOpen);
    if (willOpen && !loadedOnce) {
      loadComments();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const content = newComment.trim();
    setNewComment("");

    startSending(async () => {
      const result = await addComment(activityId, content);
      if (result.success) {
        const data = await getActivityComments(activityId);
        setComments(data);
        setCount(data.length);
      }
    });
  };

  const handleDelete = (commentId: string) => {
    startSending(async () => {
      const result = await deleteComment(commentId);
      if (result.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setCount((prev) => prev - 1);
      }
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "A l'instant";
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  return (
    <div>
      {/* Bouton commentaires */}
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="material-symbols-outlined text-[20px]">chat_bubble_outline</span>
        {count > 0 ? (
          <span>{count} commentaire{count > 1 ? "s" : ""}</span>
        ) : (
          <span>Commenter</span>
        )}
      </button>

      {/* Section commentaires dépliée */}
      {isOpen && (
        <div className="mt-3 space-y-3">
          {/* Liste des commentaires */}
          {isLoading ? (
            <div className="flex justify-center py-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            comments.length > 0 && (
              <div className="space-y-2.5">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2.5">
                    {/* Avatar */}
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {comment.user.avatar_url ? (
                        <Image
                          src={comment.user.avatar_url}
                          alt={comment.user.username}
                          className="h-7 w-7 rounded-full object-cover"
                          width={28}
                          height={28}
                        />
                      ) : (
                        comment.user.display_name?.[0]?.toUpperCase() ||
                        comment.user.username[0].toUpperCase()
                      )}
                    </div>

                    {/* Contenu */}
                    <div className="min-w-0 flex-1">
                      <div className="rounded-xl bg-accent/40 px-3 py-2">
                        <span className="text-sm font-semibold">
                          {comment.user.display_name || comment.user.username}
                        </span>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 px-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(comment.created_at)}
                        </span>
                        {comment.user_id === currentUserId && (
                          <button
                            onClick={() => handleDelete(comment.id)}
                            disabled={isSending}
                            className="text-xs text-muted-foreground transition-colors hover:text-destructive"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Formulaire de commentaire */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ecrire un commentaire..."
              maxLength={500}
              className="min-w-0 flex-1 rounded-xl border border-border bg-accent/30 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary"
            />
            <button aria-label="Envoyer le commentaire"
              type="submit"
              disabled={!newComment.trim() || isSending}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
