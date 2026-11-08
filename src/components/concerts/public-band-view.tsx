import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getIntlLocale } from "@/i18n/server";
import { bandPosteLabel } from "@/lib/instruments";
import { formatConcertDate } from "@/lib/concerts";
import type { PublicBand, PublicBandConcert } from "@/types";

const SECTION_TITLE =
  "border-b border-border pb-2 font-display text-[13px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground";

/** La page publique d'un groupe : presentation, concerts, line-up, ce qui a ete joue. */
export async function PublicBandView({ band }: { band: PublicBand }) {
  const t = await getTranslations("bandPublic.page");
  const te = await getTranslations("enums");
  const locale = await getIntlLocale();

  return (
    <article className="mx-auto max-w-3xl space-y-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end">
        {band.cover_url ? (
          <Image
            src={band.cover_url}
            alt=""
            width={160}
            height={160}
            className="h-32 w-32 shrink-0 rounded-2xl object-cover sm:h-40 sm:w-40"
            // Comme dans l'app : servie telle quelle, sans l'optimiseur de Next.
            unoptimized
            priority
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl bg-secondary font-display text-6xl font-extrabold text-muted-foreground sm:h-40 sm:w-40"
          >
            {band.name[0]?.toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t("eyebrow")}</p>
          <h1 className="mt-1 font-display text-5xl font-extrabold uppercase leading-[0.9] [overflow-wrap:anywhere] sm:text-6xl">
            {band.name}
          </h1>
          {band.description && <p className="mt-3 whitespace-pre-line text-[15px]">{band.description}</p>}
        </div>
      </header>

      <section>
        <h2 className={SECTION_TITLE}>{t("upcoming")}</h2>
        {band.upcoming.length > 0 ? (
          <ul>
            {band.upcoming.map((concert, index) => (
              <li key={`${concert.date}-${index}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border py-4">
                <ConcertWhen concert={concert} locale={locale} />
                {concert.ticket_url && (
                  <a
                    href={concert.ticket_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="ml-auto inline-flex min-h-[40px] items-center rounded-full bg-foreground px-4 text-sm font-semibold text-background"
                  >
                    {t("tickets")}
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-5 text-sm text-muted-foreground">{t("noUpcoming")}</p>
        )}
      </section>

      <section>
        <h2 className={SECTION_TITLE}>{t("lineup")}</h2>
        <ul className="grid gap-x-6 sm:grid-cols-2">
          {band.members.map((member) => {
            const name = member.display_name || member.username;
            const poste = bandPosteLabel(member, te);
            const content = (
              <>
                {member.avatar_url ? (
                  <Image
                    src={member.avatar_url}
                    alt=""
                    width={40}
                    height={40}
                    unoptimized
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-lg font-extrabold text-muted-foreground"
                  >
                    {name[0]?.toUpperCase()}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{name}</span>
                  {poste && <span className="block truncate text-xs text-muted-foreground">{poste}</span>}
                </span>
              </>
            );
            return (
              <li key={member.username} className="border-b border-border">
                {member.is_private ? (
                  <div className="flex items-center gap-3 py-2.5">{content}</div>
                ) : (
                  <Link href={`/commu/amis/${member.username}`} className="flex items-center gap-3 py-2.5 hover:opacity-80">
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {band.past.length > 0 && (
        <section>
          <h2 className={SECTION_TITLE}>{t("past")}</h2>
          <ul>
            {band.past.map((concert, index) => (
              <li key={`${concert.date}-${index}`} className="border-b border-border py-3">
                {concert.songs && concert.songs.length > 0 ? (
                  <details>
                    <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
                      <ConcertWhen concert={concert} locale={locale} muted />
                      <span className="ml-auto shrink-0 text-xs font-semibold text-muted-foreground">
                        {t("songCount", { count: concert.songs.length })}
                      </span>
                    </summary>
                    <ol className="mt-2 list-decimal space-y-0.5 pl-6 text-sm">
                      {concert.songs.map((song, songIndex) => (
                        <li key={songIndex}>
                          {song.title}
                          {song.artist && <span className="text-muted-foreground"> · {song.artist}</span>}
                        </li>
                      ))}
                    </ol>
                  </details>
                ) : (
                  <ConcertWhen concert={concert} locale={locale} muted />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="rounded-2xl border border-border p-5 text-center">
        <p className="text-sm text-muted-foreground">{t("poweredBy")}</p>
        <Link href="/" className="mt-2 inline-flex min-h-[40px] items-center rounded-full border border-border px-4 text-sm font-semibold hover:bg-accent">
          {t("discover")}
        </Link>
      </footer>
    </article>
  );
}

function ConcertWhen({ concert, locale, muted = false }: { concert: PublicBandConcert; locale: string; muted?: boolean }) {
  const place = [concert.venue, concert.city].filter(Boolean).join(", ");
  const date = formatConcertDate(concert.date, locale);
  return (
    <div className="min-w-0">
      <p className={`text-sm font-semibold first-letter:uppercase ${muted ? "text-muted-foreground" : ""}`}>
        {concert.time ? `${date} · ${concert.time}` : date}
      </p>
      <p className="truncate text-[15px]">
        {place || concert.name}
        {place && concert.name && <span className="text-muted-foreground"> · {concert.name}</span>}
      </p>
    </div>
  );
}
