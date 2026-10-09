import Image from "next/image";
import Link from "next/link";
import type { UserProfile } from "@/types";
import { SocialLinks } from "./social-links";
import { Icon } from "@/components/ui/icon";

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

  /*
   * La banniere, style Fanzine (docs/refonte-ui.md) : quatre pochettes de
   * la vitrine cote a cote, comme le mur d'une chambre. Albums favoris
   * d'abord, morceaux favoris pour completer ; sans aucune pochette, pas
   * de banniere du tout plutot qu'un aplat decoratif.
   */
  const banner = [
    ...[...profile.favorite_albums].sort((a, b) => a.position - b.position).map((f) => f.cover_url),
    ...[...profile.favorite_songs].sort((a, b) => a.position - b.position).map((f) => f.song.cover_url),
  ]
    .filter((url): url is string => Boolean(url))
    .slice(0, 4);

  const name = profile.display_name || profile.username;

  return (
    <div className="mb-5">
      {banner.length >= 2 && (
        <div
          aria-hidden="true"
          className="relative -mx-4 -mt-4 mb-[-56px] grid h-44 grid-cols-4 overflow-hidden lg:-mx-0 lg:-mt-0 lg:h-48 lg:rounded-md"
          style={{ gridTemplateColumns: `repeat(${banner.length}, minmax(0, 1fr))` }}
        >
          {banner.map((url, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={`${url}-${index}`} src={url} alt="" className="h-full w-full object-cover" />
          ))}
          <span className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-background" />
        </div>
      )}

      <div className="relative flex items-end gap-3.5">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full object-cover shadow-[0_0_0_3px_var(--background)] lg:h-20 lg:w-20"
            width={80}
            height={80}
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-3xl font-extrabold text-muted-foreground shadow-[0_0_0_3px_var(--background)] lg:h-20 lg:w-20">
            {name[0]?.toUpperCase()}
          </div>
        )}

        <div className="flex-1" />

        <Link
          href="/profil/reglages"
          aria-label="Éditer mon profil"
          className="flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-[13px] font-semibold transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon name="edit" className="h-4 w-4" />
          Éditer
        </Link>
      </div>

      <div className="mt-2.5">
        <h1 className="flex flex-wrap items-center gap-2 font-display text-[34px] font-extrabold uppercase leading-[0.95] lg:text-[44px]">
          <span className="min-w-0 truncate">{name}</span>
          {profile.plan !== "free" && (
            <span className="rounded bg-primary px-1.5 py-0.5 font-display text-[11px] font-bold tracking-[0.08em] text-primary-foreground">
              {profile.plan.toUpperCase()}
            </span>
          )}
        </h1>
        <p className="truncate text-sm text-muted-foreground">@{profile.username}</p>

        {profile.bio && (
          <p className="mt-1.5 line-clamp-3 max-w-prose font-serif text-[15px] italic leading-relaxed">
            {profile.bio}
          </p>
        )}

        {hasSocials && (
          <div className="mt-2">
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

      {/* Les chiffres, style Atelier : une ligne a filets, pas des tuiles */}
      <dl className="mt-4 grid grid-cols-4 border-y border-border py-2.5">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col-reverse gap-0.5">
            <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {stat.label}
            </dt>
            <dd className="tabular font-display text-[26px] font-bold leading-none">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
