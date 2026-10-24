"use client";

import { Lock } from "lucide-react";
import { useMyProfileIsPrivate } from "@/components/providers/profile-privacy-provider";

export type Audience = "friends" | "public";

export interface AudienceTexts {
  /** La case : « Réservée à mes amis ». */
  friendsOnly: string;
  friendsOnlyHint: string;
  publicHint: string;
  /** A la place de la case, sur un profil prive. */
  privateProfile: string;
}

/**
 * Qui voit ce que je partage (cover, envie de matos…). Ca suit le profil :
 * « Public » sur un profil public, entre amis sur un profil prive (la RLS
 * plafonne). Sur un profil public, une case le garde entre amis.
 */
export function AudienceField({
  value,
  onChange,
  texts,
}: {
  value: Audience;
  onChange: (value: Audience) => void;
  texts: AudienceTexts;
}) {
  const profileIsPrivate = useMyProfileIsPrivate();

  if (profileIsPrivate) {
    return (
      <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
        {texts.privateProfile}
      </p>
    );
  }

  return (
    <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2.5">
      <input
        type="checkbox"
        checked={value === "friends"}
        onChange={(event) => onChange(event.target.checked ? "friends" : "public")}
        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{texts.friendsOnly}</span>
        <span className="block text-xs text-muted-foreground">
          {value === "friends" ? texts.friendsOnlyHint : texts.publicHint}
        </span>
      </span>
    </label>
  );
}
