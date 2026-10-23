"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import { Avatar } from "@/components/social/activity-card";
import { profileHref } from "@/lib/navigation";
import type { AlbumReviewWithProfile } from "@/types";

/**
 * Ce que mes amis ont pense de l'album : leur note, leurs morceaux
 * preferes, leur avis. Le feed le montrait le jour de la review, puis
 * plus rien : c'est ici qu'on le cherche quand on ouvre l'album.
 */
export function FriendsAlbumReviews({ reviews }: { reviews: AlbumReviewWithProfile[] }) {
  const t = useTranslations("albums.detail");

  if (reviews.length === 0) return null;

  return (
    <section aria-labelledby="album-friends" className="mt-6">
      <h2
        id="album-friends"
        className="mb-1 border-b border-border pb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
      >
        {t("friendsTitle", { count: reviews.length })}
      </h2>
      <ul className="divide-y divide-border border-b border-border">
        {reviews.map((review) => (
          <FriendReview key={review.id} review={review} />
        ))}
      </ul>
    </section>
  );
}

function FriendReview({ review }: { review: AlbumReviewWithProfile }) {
  const t = useTranslations("albums.detail");
  const ta = useTranslations("activity");
  const [open, setOpen] = useState(false);
  const name = review.user.display_name || review.user.username;
  const favorites = review.favorite_tracks ?? [];

  return (
    <li className="flex items-start gap-3 py-3">
      <Link href={profileHref(review.user.username)} aria-label={ta("profileOf", { name })} className="shrink-0 rounded-full">
        <Avatar url={review.user.avatar_url} name={name} size={36} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <Link href={profileHref(review.user.username)} className="text-sm font-bold underline-offset-2 hover:underline">
            {name}
          </Link>
          <StarRating value={review.rating / 2} size="sm" />
        </div>

        {favorites.length > 0 && (
          <p className="mt-1 flex items-start gap-1.5 text-[13px]">
            <Heart className="mt-[3px] h-3.5 w-3.5 shrink-0 fill-primary text-primary" strokeWidth={0} aria-hidden="true" />
            <span className="min-w-0">
              <span className="text-muted-foreground">{t("friendFavorite", { count: favorites.length })}</span>{" "}
              <span className="font-semibold">{favorites.map((track) => track.name).join(", ")}</span>
            </span>
          </p>
        )}

        {review.review && (
          <>
            <p
              className={`mt-1.5 whitespace-pre-wrap font-serif text-[15px] italic leading-relaxed ${open ? "" : "line-clamp-3"}`}
            >
              {review.review}
            </p>
            {review.review.length > 200 && (
              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="mt-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                {open ? ta("collapse") : ta("readReview")}
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}
