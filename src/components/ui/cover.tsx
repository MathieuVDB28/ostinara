import { Music } from "lucide-react";

interface CoverProps {
  /** URL de la pochette (Spotify), ou rien. */
  src?: string | null;
  /** Vide par defaut : la pochette accompagne un titre deja lu. */
  alt?: string;
  /** Taille et arrondi, ex. "h-16 w-16 rounded-md". */
  className?: string;
  /** Chargement differe, sauf pour les pochettes visibles d'emblee. */
  priority?: boolean;
  children?: React.ReactNode;
}

/**
 * Une pochette, toujours avec son lisere.
 *
 * Une bonne part des bibliotheques metal sont noires — Black Album,
 * Meteora, Mutter — et se fondaient dans le fond sombre. Le lisere de
 * 1 px, tire de l'encre du theme, garde le bord visible dans les deux
 * themes. Il est pose en ::after, parce qu'une ombre interne sur une
 * <img> se dessine sous l'image et ne se voit pas.
 *
 * `children` sert aux surimpressions : badge « ×3 », note, duree.
 */
export function Cover({ src, alt = "", className = "", priority = false, children }: CoverProps) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-muted after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent)] ${className}`}
    >
      {src ? (
        // Pochettes Spotify deja dimensionnees par le CDN : <img>, comme
        // partout ailleurs dans l'app, plutot que l'optimiseur d'images.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-muted-foreground">
          <Music className="h-1/3 w-1/3" strokeWidth={1.5} aria-hidden="true" />
        </span>
      )}
      {children}
    </div>
  );
}
