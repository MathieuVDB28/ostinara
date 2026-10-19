import { useTranslations } from "next-intl";

/**
 * Le lecteur Deezer d'un titre : l'original, pour l'oreille.
 *
 * Sans compte Deezer, le widget joue l'extrait de 30 secondes ; avec, le
 * titre entier. Le theme suit celui du systeme.
 */
export function DeezerPlayer({ trackId, title, className = "" }: { trackId: string; title: string; className?: string }) {
  const t = useTranslations("media");
  return (
    <iframe
      title={t("listenTitleOnDeezer", { title })}
      src={`https://widget.deezer.com/widget/auto/track/${trackId}?tracklist=false`}
      width="100%"
      height="152"
      allow="encrypted-media; clipboard-write"
      loading="lazy"
      className={`rounded-xl border-0 ${className}`}
    />
  );
}
