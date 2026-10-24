"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { useMyProfileIsPrivate } from "@/components/providers/profile-privacy-provider";
import type { CoverVisibility } from "@/types";

/**
 * Qui voit la cover. Elle suit le profil : publique sur un profil public,
 * entre amis sur un profil prive. Sur un profil public, une case la garde
 * entre amis. « Moi seul » n'est plus propose ; une cover ancienne qui
 * l'etait le reste jusqu'a ce qu'on la partage.
 */
export function CoverVisibilityField({
  value,
  onChange,
}: {
  value: CoverVisibility;
  onChange: (value: CoverVisibility) => void;
}) {
  const t = useTranslations("covers.visibilityField");
  const profileIsPrivate = useMyProfileIsPrivate();

  if (value === "private") {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground">{t("onlyMe")}</p>
          <button
            type="button"
            onClick={() => onChange("public")}
            className="mt-1 font-semibold text-primary hover:underline"
          >
            {profileIsPrivate ? t("shareWithFriends") : t("share")}
          </button>
        </div>
      </div>
    );
  }

  if (profileIsPrivate) {
    return (
      <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
        {t("privateProfile")}
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
        <span className="block text-sm font-medium">{t("friendsOnly")}</span>
        <span className="block text-xs text-muted-foreground">
          {value === "friends" ? t("friendsOnlyHint") : t("publicHint")}
        </span>
      </span>
    </label>
  );
}
