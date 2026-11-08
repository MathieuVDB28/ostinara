import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getPublicBand } from "@/lib/actions/band-public";
import { siteUrl } from "@/lib/blog/categories";
import { bandPublicHref } from "@/lib/concerts";
import { PublicBandView } from "@/components/concerts/public-band-view";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const band = await getPublicBand(slug);
  if (!band) return { robots: { index: false } };
  const t = await getTranslations("bandPublic.page");
  const description =
    band.description?.replace(/\s+/g, " ").slice(0, 160) ||
    t("metaDescription", { name: band.name, count: band.upcoming.length });
  return {
    metadataBase: new URL(siteUrl()),
    title: t("metaTitle", { name: band.name }),
    description,
    alternates: { canonical: bandPublicHref(band.slug) },
    openGraph: {
      type: "profile",
      title: band.name,
      description,
      url: bandPublicHref(band.slug),
      images: band.cover_url ? [{ url: band.cover_url }] : undefined,
    },
  };
}

/** La vitrine publique d'un groupe : sans compte, referencee. */
export default async function PublicBandPage({ params }: Props) {
  const { slug } = await params;
  const band = await getPublicBand(slug);
  if (!band) notFound();

  const t = await getTranslations("enums");
  const url = `${siteUrl()}${bandPublicHref(band.slug)}`;
  // Donnees structurees : le groupe, ses membres et ses concerts a venir (avec un lieu).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: band.name,
    url,
    description: band.description ?? undefined,
    image: band.cover_url ?? undefined,
    member: band.members.map((member) => ({
      "@type": "OrganizationRole",
      member: { "@type": "Person", name: member.display_name || member.username },
      roleName: member.instrument
        ? member.instrument === "other" && member.instrument_label
          ? member.instrument_label
          : t(`instrument.${member.instrument}`)
        : undefined,
    })),
    event: band.upcoming
      .filter((concert) => concert.venue || concert.city)
      .map((concert) => ({
        "@type": "MusicEvent",
        name: concert.name,
        startDate: concert.time ? `${concert.date}T${concert.time}` : concert.date,
        eventStatus: "https://schema.org/EventScheduled",
        location: {
          "@type": "Place",
          name: concert.venue || concert.city,
          address: concert.city ? { "@type": "PostalAddress", addressLocality: concert.city } : undefined,
        },
        performer: { "@type": "MusicGroup", name: band.name, url },
        offers: concert.ticket_url ? { "@type": "Offer", url: concert.ticket_url } : undefined,
      })),
  };

  return (
    <div className="px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <PublicBandView band={band} />
    </div>
  );
}
