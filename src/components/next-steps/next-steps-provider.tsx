"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { NextStep } from "./types";

// La feuille charge AddCoverModal, qui entraine l'upload video : rien de
// tout cela n'est utile avant le premier moment a celebrer.
const NextStepSheet = dynamic(() =>
  import("./next-step-sheet").then((m) => m.NextStepSheet)
);

interface NextStepsContextValue {
  /** Propose la suite d'un geste. Plusieurs moments s'enchainent. */
  show: (step: NextStep) => void;
}

const NextStepsContext = createContext<NextStepsContextValue | null>(null);

/**
 * Les ponts entre les grandes features de l'app.
 *
 * Chaque fin de geste — un morceau maitrise, un album note, un morceau
 * repris d'un ami — appelle une suite qui vit ailleurs : la cover, la
 * setlist, la biblio, le defi. Plutot que de cabler chaque ecran a chaque
 * autre, l'ecran annonce le moment (`show`) et la feuille propose la
 * suite. Une nouvelle feature s'y branche en ajoutant un moment dans
 * ./types.ts et sa vue dans ./next-step-sheet.tsx.
 */
export function NextStepsProvider({ children }: { children: React.ReactNode }) {
  // Un identifiant par moment : empiler un moment pendant qu'une feuille
  // est ouverte ne doit pas la remonter (et perdre ce qu'on y a coche).
  const [queue, setQueue] = useState<{ id: number; step: NextStep }[]>([]);
  const nextId = useRef(0);

  const show = useCallback((step: NextStep) => {
    nextId.current += 1;
    const id = nextId.current;
    setQueue((previous) => [...previous, { id, step }]);
  }, []);

  const dismiss = useCallback(() => {
    setQueue((previous) => previous.slice(1));
  }, []);

  const value = useMemo(() => ({ show }), [show]);
  const current = queue[0];

  return (
    <NextStepsContext.Provider value={value}>
      {children}
      {current && <NextStepSheet key={current.id} step={current.step} onDone={dismiss} />}
    </NextStepsContext.Provider>
  );
}

/**
 * Hors du layout authentifie, il n'y a pas de feuille : l'appel ne fait
 * rien plutot que de casser l'ecran qui l'emet.
 */
export function useNextSteps(): NextStepsContextValue {
  return useContext(NextStepsContext) ?? NOOP;
}

const NOOP: NextStepsContextValue = { show: () => {} };
