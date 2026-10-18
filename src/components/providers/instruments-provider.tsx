"use client";

import { createContext, useContext, useMemo } from "react";
import { sortInstruments } from "@/lib/instruments";
import type { Instrument, ProfileInstrument } from "@/types";

interface InstrumentsState {
  /** L'instrument principal d'abord. */
  instruments: ProfileInstrument[];
  primary: Instrument;
  /** Plus d'un instrument : les ecrans montrent alors le choix. */
  isMulti: boolean;
  plays: (instrument: Instrument) => boolean;
}

const InstrumentsContext = createContext<InstrumentsState | null>(null);

/**
 * Les instruments du musicien connecte, charges une fois par le layout
 * principal : la modale de session, la fiche morceau, les exercices et
 * l'accordeur en ont besoin sans refaire la requete.
 */
export function InstrumentsProvider({
  instruments,
  children,
}: {
  instruments: ProfileInstrument[];
  children: React.ReactNode;
}) {
  const value = useMemo<InstrumentsState>(() => {
    const sorted = sortInstruments(instruments);
    const values = new Set(sorted.map((entry) => entry.instrument));
    return {
      instruments: sorted,
      primary: sorted[0]?.instrument ?? "guitar",
      isMulti: sorted.length > 1,
      plays: (instrument) => values.has(instrument),
    };
  }, [instruments]);

  return <InstrumentsContext.Provider value={value}>{children}</InstrumentsContext.Provider>;
}

export function useMyInstruments(): InstrumentsState {
  const context = useContext(InstrumentsContext);
  if (!context) throw new Error("useMyInstruments doit être utilisé dans InstrumentsProvider");
  return context;
}
