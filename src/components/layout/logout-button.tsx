"use client";

import { useState } from "react";
import { logout } from "@/lib/actions/auth";
import { purgeOfflineData } from "@/lib/offline/purge";

/**
 * La deconnexion, cache local compris.
 *
 * C'etait un `<form action={logout}>`. Depuis que l'app garde une copie
 * hors ligne de la bibliotheque et du journal, ca ne suffit plus : sur un
 * telephone partage, couper le reseau apres la deconnexion aurait ramene
 * les donnees du compte precedent.
 *
 * Le menage precede l'appel au serveur et non l'inverse : `logout()`
 * redirige, et une navigation en cours annule les taches asynchrones qui
 * n'ont pas eu le temps de se terminer.
 */
export function LogoutButton({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    setPending(true);
    await purgeOfflineData();
    await logout();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={className}
    >
      {pending ? "Déconnexion…" : label}
    </button>
  );
}
