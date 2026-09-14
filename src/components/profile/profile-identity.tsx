import Image from "next/image";
import Link from "next/link";
import type { UserProfile } from "@/types";
import { SocialLinks } from "./social-links";

interface ProfileIdentityProps {
  profile: UserProfile;
}

/**
 * L'identite, persistante au-dessus des trois segments du profil.
 *
 * C'etait une modale accessible depuis la seule sidebar desktop : sur
 * mobile le profil, les reglages et la deconnexion n'avaient aucun
 * chemin d'acces.
 */
export function ProfileIdentity({ profile }: ProfileIdentityProps) {
  const stats = [
    { label: "Morceaux", value: profile.stats.totalSongs },
    { label: "Maîtrisés", value: profile.stats.masteredSongs },
    { label: "Covers", value: profile.stats.totalCovers },
    { label: "Amis", value: profile.stats.friendsCount },
  ];

  const hasSocials =
    profile.instagram_url ||
    profile.tiktok_url ||
    profile.twitter_url ||
    profile.facebook_url;

  return (
    <div className="mb-6">
      <div className="flex items-start gap-4">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full object-cover lg:h-20 lg:w-20"
            width={64}
            height={64}
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary lg:h-20 lg:w-20">
            {(profile.display_name || profile.username)[0]?.toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-extrabold lg:text-3xl">
              {profile.display_name || profile.username}
            </h1>
            {profile.plan !== "free" && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold uppercase text-primary">
                {profile.plan}
              </span>
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            @{profile.username}
          </p>

          {profile.bio && (
            <p className="mt-2 line-clamp-3 text-sm text-foreground">
              {profile.bio}
            </p>
          )}

          {hasSocials && (
            <div className="mt-3">
              <SocialLinks
                links={{
                  instagram: profile.instagram_url,
                  tiktok: profile.tiktok_url,
                  twitter: profile.twitter_url,
                  facebook: profile.facebook_url,
                }}
              />
            </div>
          )}
        </div>

        <Link
          href="/profil/reglages"
          className="flex min-h-[44px] shrink-0 items-center rounded-xl border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          Éditer
        </Link>
      </div>

      {/* Stats */}
      <dl className="mt-5 grid grid-cols-4 gap-2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl bg-accent/50 px-2 py-3 text-center"
          >
            <dd className="text-xl font-extrabold">{stat.value}</dd>
            <dt className="text-[11px] text-muted-foreground">{stat.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
