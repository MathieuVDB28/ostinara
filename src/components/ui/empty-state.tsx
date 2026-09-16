"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Un etat vide dit trois choses : ce qui manque, a quoi ca sert, et le
 * geste suivant.
 *
 * Ceux de l'app s'arretaient a la premiere. « Aucun defi », « Aucun
 * groupe », « Aucune setlist perso » : un constat, et rien a faire depuis
 * l'ecran ou on se trouve. Le seul complet etait celui de la
 * bibliotheque — il expliquait ou part le morceau qu'on ajoute. C'est ce
 * modele-la qui est generalise ici : titre, raison, action, et la phrase
 * qui dit ce qui se passe apres.
 */

export interface EmptyStateAction {
  label: string;
  /** Nom d'icone Material Symbols. Relancer `npm run icons` apres ajout. */
  icon?: string;
  href?: string;
  onClick?: () => void;
  /** Une seule action principale : la suite evidente, pas un menu. */
  primary?: boolean;
  disabled?: boolean;
  /** Pourquoi l'action est indisponible — sinon un bouton grise ne dit rien. */
  disabledReason?: string;
}

interface EmptyStateProps {
  /** Nom d'icone Material Symbols. */
  icon: string;
  title: string;
  description: ReactNode;
  actions?: EmptyStateAction[];
  /** Ce qui se passe apres l'action : ou va ce qu'on vient de creer. */
  hint?: ReactNode;
  /** Un etat vide imbrique dans une section se contente de moins d'air. */
  compact?: boolean;
  className?: string;
}

const BASE =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const PRIMARY = `${BASE} bg-primary text-primary-foreground hover:opacity-90`;
const SECONDARY = `${BASE} border border-input text-foreground transition-colors hover:bg-accent`;

function ActionButton({ action }: { action: EmptyStateAction }) {
  const className = action.primary ? PRIMARY : SECONDARY;

  const content = (
    <>
      {action.icon && (
        <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
          {action.icon}
        </span>
      )}
      {action.label}
    </>
  );

  // Un lien desactive n'existe pas : quand l'action est fermee, on rend un
  // bouton inerte qui porte sa raison plutot qu'un lien qui mene ailleurs.
  if (action.disabled) {
    return (
      <span className="flex flex-col items-center gap-1.5">
        <button type="button" disabled className={`${className} opacity-50`}>
          {content}
        </button>
        {action.disabledReason && (
          <span className="text-xs text-muted-foreground">
            {action.disabledReason}
          </span>
        )}
      </span>
    );
  }

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} className={className}>
      {content}
    </button>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  actions,
  hint,
  compact = false,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 text-center ${
        compact ? "py-10" : "py-14"
      } ${className}`}
    >
      <div
        className={`mb-4 flex items-center justify-center rounded-full bg-primary/10 text-primary ${
          compact ? "h-12 w-12" : "h-16 w-16"
        }`}
      >
        <span
          aria-hidden="true"
          className={`material-symbols-outlined ${compact ? "text-2xl" : "text-3xl"}`}
        >
          {icon}
        </span>
      </div>

      <h3 className={`mb-2 font-semibold ${compact ? "text-base" : "text-lg"}`}>
        {title}
      </h3>

      <p className="max-w-sm text-balance text-sm text-muted-foreground">
        {description}
      </p>

      {actions && actions.length > 0 && (
        <div className="mt-6 flex flex-wrap items-start justify-center gap-3">
          {actions.map((action) => (
            <ActionButton key={action.label} action={action} />
          ))}
        </div>
      )}

      {hint && (
        <p className="mt-5 max-w-sm text-balance text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
