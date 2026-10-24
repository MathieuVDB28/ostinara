"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { useMyProfileIsPrivate } from "@/components/providers/profile-privacy-provider";
import { AudienceField } from "@/components/ui/audience-field";
import type { CoverVisibility } from "@/types";

/**
 * Qui voit la cover : elle suit le profil (cf. AudienceField). « Moi seul »
 * n'est plus propose ; une cover ancienne qui l'etait le reste jusqu'a ce
 * qu'on la partage.
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

  return (
    <AudienceField
      value={value}
      onChange={onChange}
      texts={{
        friendsOnly: t("friendsOnly"),
        friendsOnlyHint: t("friendsOnlyHint"),
        publicHint: t("publicHint"),
        privateProfile: t("privateProfile"),
      }}
    />
  );
}
