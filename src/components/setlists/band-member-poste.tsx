"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBandMemberInstrument } from "@/lib/actions/bands";
import { INSTRUMENTS, bandPosteLabel, instrumentMeta } from "@/lib/instruments";
import { InstrumentSwitch } from "@/components/instruments/instrument-switch";
import { Icon } from "@/components/ui/icon";
import type { BandMemberWithProfile, Instrument } from "@/types";

interface Props {
  bandId: string;
  member: BandMemberWithProfile;
  /** Soi-meme, ou proprietaire / admin du groupe. */
  canEdit: boolean;
}

/**
 * Le poste d'un membre dans le groupe, et son edition sur place.
 *
 * Le poste n'est pas forcement l'instrument principal du profil : on peut
 * etre guitariste partout et bassiste ici. « Autre » prend un nom libre,
 * c'est la que le chant trouve sa place.
 */
export function BandMemberPoste({ bandId, member, canEdit }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [instrument, setInstrument] = useState<Instrument | null>(member.instrument ?? null);
  const [label, setLabel] = useState(member.instrument_label ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const poste = bandPosteLabel(member);

  const handleSave = () => {
    if (!instrument) return;
    setError(null);
    startTransition(async () => {
      const result = await setBandMemberInstrument(bandId, member.user_id, instrument, label);
      if (result.success) {
        setEditing(false);
        router.refresh();
      } else {
        setError(result.error ?? "Oups, ça n'est pas passé.");
      }
    });
  };

  const summary = (
    <span className="inline-flex items-center gap-1">
      {member.instrument && <Icon name={instrumentMeta(member.instrument).icon} className="h-3.5 w-3.5" />}
      {poste ?? "Poste à préciser"}
    </span>
  );

  if (!editing) {
    return canEdit ? (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex min-h-[28px] items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        {summary}
        <Icon name="edit" className="h-3 w-3" />
        <span className="sr-only">Changer le poste</span>
      </button>
    ) : (
      <span className="text-xs text-muted-foreground">{summary}</span>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <InstrumentSwitch
        options={INSTRUMENTS.map((i) => ({ instrument: i.value }))}
        value={instrument}
        onChange={setInstrument}
        label={`Poste de ${member.profile?.display_name || member.profile?.username} dans le groupe`}
      />
      {instrument === "other" && (
        <input
          type="text"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          maxLength={40}
          placeholder="Lequel ? (chant, saxo, percus…)"
          aria-label="Quel poste ?"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      )}
      {error && (
        <p role="alert" className="text-xs font-semibold text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!instrument || isPending}
          className="min-h-[34px] rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-60"
        >
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setInstrument(member.instrument ?? null);
            setLabel(member.instrument_label ?? "");
            setError(null);
          }}
          className="min-h-[34px] rounded-full border border-border px-4 text-xs font-semibold text-muted-foreground hover:bg-accent"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
