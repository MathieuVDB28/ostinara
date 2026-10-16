import { Headphones } from "lucide-react";

/**
 * « Écouter sur Deezer » : le lien d'ecoute d'un album ou d'un titre.
 *
 * Aux couleurs de l'app, pas a celles du service : le bouton dit ou l'on
 * va, il ne fait pas la publicite du fournisseur.
 */
export function ListenLink({ href, className = "" }: { href?: string | null; className?: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold transition-colors hover:bg-accent ${className}`}
    >
      <Headphones className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
      Écouter sur Deezer
    </a>
  );
}
