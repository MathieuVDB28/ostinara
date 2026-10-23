"use client";

import { useState } from "react";

/**
 * Vrai au rendu ou l'une des valeurs a change depuis le rendu precedent
 * (et au premier rendu).
 *
 * Pour remettre un formulaire a zero quand une modale s'ouvre ou que ses
 * props changent : fait pendant le rendu, comme le recommande React
 * (« adjusting some state when a prop changes »), plutot que dans un effet
 * qui afficherait d'abord l'ancien etat puis rendrait une seconde fois.
 *
 *   const reset = useDepsChanged([isOpen, session]);
 *   if (reset && isOpen) { setTitle(""); … }
 */
export function useDepsChanged(deps: readonly unknown[]): boolean {
  const [previous, setPrevious] = useState<readonly unknown[] | null>(null);
  const changed =
    previous === null ||
    previous.length !== deps.length ||
    deps.some((value, index) => !Object.is(value, previous[index]));
  if (changed) setPrevious(deps);
  return changed;
}
