"use client";

import dynamic from "next/dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { saveTechRider } from "@/lib/actions/tech-riders";
import { bandPosteLabel } from "@/lib/instruments";
import { TechRiderStagePlot } from "./tech-rider-stage-plot";
// Meme raison que pour les setlists : le moteur PDF reste hors du bundle
// initial et n'arrive qu'au moment de l'export.
const TechRiderPDFExport = dynamic(
  () => import("./tech-rider-pdf").then((m) => m.TechRiderPDFExport),
  {
    ssr: false,
    loading: () => (
      <div className="h-10 w-32 animate-pulse rounded-xl bg-muted" />
    ),
  }
);
import type {
  BandWithMembers,
  TechRider,
  TechRiderMusician,
  TechRiderChannel,
  TechRiderStageElement,
} from "@/types";

interface Props {
  band: BandWithMembers;
  initialData: TechRider | null;
  canEdit: boolean;
}

export function TechRiderView({ band, initialData, canEdit }: Props) {
  const t = useTranslations("techRider.view");
  const te = useTranslations("enums");
  const router = useRouter();
  const [engineerName, setEngineerName] = useState(
    initialData?.sound_engineer_name || ""
  );
  const [engineerPhone, setEngineerPhone] = useState(
    initialData?.sound_engineer_phone || ""
  );
  const [musicians, setMusicians] = useState<TechRiderMusician[]>(
    initialData?.musicians || []
  );
  const [channels, setChannels] = useState<TechRiderChannel[]>(
    initialData?.channels || []
  );
  const [stageElements, setStageElements] = useState<TechRiderStageElement[]>(
    initialData?.stage_elements || []
  );
  const [generalNotes, setGeneralNotes] = useState(
    initialData?.general_notes || ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // === Musicians handlers ===
  const addMusician = () => {
    setMusicians((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        instrument: "",
        needs: "",
        monitor: false,
        position_x: 30 + Math.random() * 40,
        position_y: 40 + Math.random() * 30,
      },
    ]);
  };

  /*
   * Partir du groupe plutot que d'une page blanche : un musicien par
   * membre, avec son poste. Les positions s'etalent sur la largeur de
   * scene, on les ajuste ensuite sur le plan.
   */
  const prefillFromBand = () => {
    const count = band.members.length;
    setMusicians(
      band.members.map((member, index) => ({
        id: crypto.randomUUID(),
        name: member.profile?.display_name || member.profile?.username || "",
        instrument: bandPosteLabel(member, te) ?? "",
        needs: "",
        monitor: true,
        position_x: count > 1 ? 15 + (70 * index) / (count - 1) : 50,
        position_y: member.instrument === "drums" ? 30 : 60,
      }))
    );
  };

  const updateMusician = (
    id: string,
    updates: Partial<TechRiderMusician>
  ) => {
    setMusicians((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  };

  const removeMusician = (id: string) => {
    setMusicians((prev) => prev.filter((m) => m.id !== id));
  };

  // === Channels handlers ===
  const addChannel = () => {
    const nextNumber =
      channels.length > 0
        ? Math.max(...channels.map((c) => c.number)) + 1
        : 1;
    setChannels((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        number: nextNumber,
        source: "",
        musician: "",
        mic_type: "",
        stand_type: "",
        phantom: false,
        notes: "",
      },
    ]);
  };

  const updateChannel = (
    id: string,
    updates: Partial<TechRiderChannel>
  ) => {
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const removeChannel = (id: string) => {
    setChannels((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      return filtered.map((c, i) => ({ ...c, number: i + 1 }));
    });
  };

  // === Stage handlers ===
  const updateMusicianPosition = (id: string, x: number, y: number) => {
    setMusicians((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, position_x: x, position_y: y } : m
      )
    );
  };

  const updateElementPosition = (id: string, x: number, y: number) => {
    setStageElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, x, y } : el))
    );
  };

  const addStageElement = (element: TechRiderStageElement) => {
    setStageElements((prev) => [...prev, element]);
  };

  const removeStageElement = (id: string) => {
    setStageElements((prev) => prev.filter((el) => el.id !== id));
  };

  // === Save ===
  const handleSave = async () => {
    setSaving(true);
    const result = await saveTechRider(band.id, {
      sound_engineer_name: engineerName || undefined,
      sound_engineer_phone: engineerPhone || undefined,
      musicians,
      channels,
      stage_elements: stageElements,
      general_notes: generalNotes || undefined,
    });
    setSaving(false);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      alert(result.error || t("saveFailed"));
    }
  };

  // === Computed stats ===
  const micCount = channels.filter(
    (c) => c.mic_type && c.mic_type.toUpperCase() !== "DI"
  ).length;
  const diCount = channels.filter(
    (c) => c.mic_type && c.mic_type.toUpperCase() === "DI"
  ).length;
  const monitorCount = musicians.filter((m) => m.monitor).length;

  const inputClasses =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/commu/groupes")}
            aria-label={t("back")}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:bg-accent"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <h1 className="font-display text-[40px] font-extrabold uppercase leading-[0.9]">{t("title")}</h1>
            <p className="mt-1 font-display text-sm font-bold uppercase tracking-[0.06em] text-muted-foreground">{band.name}</p>
          </div>
        </div>

        <TechRiderPDFExport
          band={band}
          engineerName={engineerName}
          engineerPhone={engineerPhone}
          musicians={musicians}
          channels={channels}
          stageElements={stageElements}
          generalNotes={generalNotes}
        />
      </div>

      {/* Summary stats */}
      {(musicians.length > 0 || channels.length > 0) && (
        <div className="grid grid-cols-2 gap-3 border-y border-border py-3 sm:grid-cols-4">
          <div className="flex flex-col">
            <p className="tabular font-display text-[30px] font-bold leading-none">
              {musicians.length}
            </p>
            <p className="mt-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {t("musicians", { count: musicians.length })}
            </p>
          </div>
          <div className="flex flex-col">
            <p className="tabular font-display text-[30px] font-bold leading-none">{micCount}</p>
            <p className="mt-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {t("mics", { count: micCount })}
            </p>
          </div>
          <div className="flex flex-col">
            <p className="tabular font-display text-[30px] font-bold leading-none">{diCount}</p>
            <p className="mt-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {t("diLines", { count: diCount })}
            </p>
          </div>
          <div className="flex flex-col">
            <p className="tabular font-display text-[30px] font-bold leading-none">{monitorCount}</p>
            <p className="mt-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {t("monitors", { count: monitorCount })}
            </p>
          </div>
        </div>
      )}

      {/* Sound Engineer */}
      <section className="border-t border-border pt-5">
        <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-extrabold uppercase leading-none">
          <svg
            className="h-5 w-5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
          {t("engineer")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {t("name")}
            </label>
            <input
              type="text"
              value={engineerName}
              onChange={(e) => setEngineerName(e.target.value)}
              placeholder={t("engineerName")}
              className={inputClasses}
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
              {t("phone")}
            </label>
            <input
              type="tel"
              value={engineerPhone}
              onChange={(e) => setEngineerPhone(e.target.value)}
              placeholder={t("phonePlaceholder")}
              className={inputClasses}
              disabled={!canEdit}
            />
          </div>
        </div>
      </section>

      {/* Musicians */}
      <section className="border-t border-border pt-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold uppercase leading-none">
            <svg
              className="h-5 w-5 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            {t("musiciansTitle")}
          </h2>
          {canEdit && (
            <button aria-label={t("addMusician")}
              onClick={addMusician}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-border px-3.5 text-[13px] font-semibold transition-colors hover:bg-accent"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {t("add")}
            </button>
          )}
        </div>

        {musicians.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <p>{t("noMusician")}</p>
            {canEdit && band.members.length > 0 && (
              <button
                onClick={prefillFromBand}
                className="mt-3 inline-flex min-h-[40px] items-center rounded-full bg-primary px-4 text-[13px] font-bold text-primary-foreground transition-opacity hover:opacity-90"
              >
                {t("prefill", { count: band.members.length })}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {musicians.map((musician) => (
              <div
                key={musician.id}
                className="rounded-lg border border-border/50 bg-accent/30 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary font-display text-base font-extrabold text-muted-foreground">
                      {musician.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <input
                      type="text"
                      value={musician.name}
                      onChange={(e) =>
                        updateMusician(musician.id, { name: e.target.value })
                      }
                      placeholder={t("musicianName")}
                      className="border-none bg-transparent text-sm font-semibold focus:outline-none focus:ring-0"
                      disabled={!canEdit}
                    />
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => removeMusician(musician.id)}
                      aria-label={t("removeMusician")}
                      className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      {t("instrument")}
                    </label>
                    <input
                      type="text"
                      value={musician.instrument}
                      onChange={(e) =>
                        updateMusician(musician.id, {
                          instrument: e.target.value,
                        })
                      }
                      placeholder={t("instrumentPlaceholder")}
                      className={inputClasses}
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      {t("needs")}
                    </label>
                    <input
                      type="text"
                      value={musician.needs}
                      onChange={(e) =>
                        updateMusician(musician.id, { needs: e.target.value })
                      }
                      placeholder={t("needsPlaceholder")}
                      className={inputClasses}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={musician.monitor}
                      onChange={(e) =>
                        updateMusician(musician.id, {
                          monitor: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-border accent-primary"
                      disabled={!canEdit}
                    />
                    {t("monitor")}
                  </label>
                  {musician.monitor && (
                    <input
                      type="text"
                      value={musician.monitor_notes || ""}
                      onChange={(e) =>
                        updateMusician(musician.id, {
                          monitor_notes: e.target.value,
                        })
                      }
                      placeholder={t("monitorMix")}
                      className={`${inputClasses} flex-1`}
                      disabled={!canEdit}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Patch / Input List */}
      <section className="border-t border-border pt-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold uppercase leading-none">
            <svg
              className="h-5 w-5 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"
              />
            </svg>
            {t("patch")}
          </h2>
          {canEdit && (
            <button aria-label={t("addChannel")}
              onClick={addChannel}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-border px-3.5 text-[13px] font-semibold transition-colors hover:bg-accent"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {t("add")}
            </button>
          )}
        </div>

        {channels.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("noChannel")}
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="p-2 text-xs font-medium text-muted-foreground w-12">
                      #
                    </th>
                    <th className="p-2 text-xs font-medium text-muted-foreground">
                      {t("source")}
                    </th>
                    <th className="p-2 text-xs font-medium text-muted-foreground">
                      {t("musician")}
                    </th>
                    <th className="p-2 text-xs font-medium text-muted-foreground">
                      {t("mic")}
                    </th>
                    <th className="p-2 text-xs font-medium text-muted-foreground">
                      {t("stand")}
                    </th>
                    <th className="p-2 text-xs font-medium text-muted-foreground w-12">
                      48V
                    </th>
                    <th className="p-2 text-xs font-medium text-muted-foreground">
                      {t("notes")}
                    </th>
                    {canEdit && <th className="p-2 w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {channels.map((ch) => (
                    <tr
                      key={ch.id}
                      className="border-b border-border/30 transition-colors hover:bg-accent/30"
                    >
                      <td className="p-2 font-mono text-xs text-muted-foreground">
                        {ch.number}
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={ch.source}
                          onChange={(e) =>
                            updateChannel(ch.id, { source: e.target.value })
                          }
                          placeholder={t("sourcePlaceholder")}
                          className="w-full border-none bg-transparent text-sm focus:outline-none focus:ring-0"
                          disabled={!canEdit}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={ch.musician}
                          onChange={(e) =>
                            updateChannel(ch.id, { musician: e.target.value })
                          }
                          placeholder={t("name")}
                          className="w-full border-none bg-transparent text-sm focus:outline-none focus:ring-0"
                          disabled={!canEdit}
                          list={`musicians-${ch.id}`}
                        />
                        <datalist id={`musicians-${ch.id}`}>
                          {musicians.map((m) => (
                            <option key={m.id} value={m.name} />
                          ))}
                        </datalist>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={ch.mic_type}
                          onChange={(e) =>
                            updateChannel(ch.id, { mic_type: e.target.value })
                          }
                          placeholder={t("micPlaceholder")}
                          className="w-full border-none bg-transparent text-sm focus:outline-none focus:ring-0"
                          disabled={!canEdit}
                          list="mic-types"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={ch.stand_type}
                          onChange={(e) =>
                            updateChannel(ch.id, {
                              stand_type: e.target.value,
                            })
                          }
                          placeholder={t("standPlaceholder")}
                          className="w-full border-none bg-transparent text-sm focus:outline-none focus:ring-0"
                          disabled={!canEdit}
                          list="stand-types"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={ch.phantom}
                          onChange={(e) =>
                            updateChannel(ch.id, {
                              phantom: e.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-border accent-primary"
                          disabled={!canEdit}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={ch.notes || ""}
                          onChange={(e) =>
                            updateChannel(ch.id, { notes: e.target.value })
                          }
                          placeholder={t("notesPlaceholder")}
                          className="w-full border-none bg-transparent text-sm focus:outline-none focus:ring-0"
                          disabled={!canEdit}
                        />
                      </td>
                      {canEdit && (
                        <td className="p-2">
                          <button
                            onClick={() => removeChannel(ch.id)}
                            aria-label={t("removeChannel")}
                            className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 sm:hidden">
              {channels.map((ch) => (
                <div
                  key={ch.id}
                  className="rounded-lg border border-border/50 bg-accent/30 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded border border-border px-1.5 py-0.5 font-mono text-xs font-bold">
                      CH {ch.number}
                    </span>
                    {canEdit && (
                      <button
                        onClick={() => removeChannel(ch.id)}
                            aria-label={t("removeChannel")}
                        className="rounded p-1 text-muted-foreground hover:text-destructive"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={ch.source}
                      onChange={(e) =>
                        updateChannel(ch.id, { source: e.target.value })
                      }
                      placeholder={t("source")}
                      className={inputClasses}
                      disabled={!canEdit}
                    />
                    <input
                      type="text"
                      value={ch.musician}
                      onChange={(e) =>
                        updateChannel(ch.id, { musician: e.target.value })
                      }
                      placeholder={t("musician")}
                      className={inputClasses}
                      disabled={!canEdit}
                    />
                    <input
                      type="text"
                      value={ch.mic_type}
                      onChange={(e) =>
                        updateChannel(ch.id, { mic_type: e.target.value })
                      }
                      placeholder={t("mic")}
                      className={inputClasses}
                      disabled={!canEdit}
                    />
                    <input
                      type="text"
                      value={ch.stand_type}
                      onChange={(e) =>
                        updateChannel(ch.id, { stand_type: e.target.value })
                      }
                      placeholder={t("stand")}
                      className={inputClasses}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={ch.phantom}
                        onChange={(e) =>
                          updateChannel(ch.id, { phantom: e.target.checked })
                        }
                        className="h-3.5 w-3.5 rounded border-border accent-primary"
                        disabled={!canEdit}
                      />
                      48V
                    </label>
                    <input
                      type="text"
                      value={ch.notes || ""}
                      onChange={(e) =>
                        updateChannel(ch.id, { notes: e.target.value })
                      }
                      placeholder={t("notes")}
                      className={`${inputClasses} flex-1`}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Datalists for suggestions */}
            <datalist id="mic-types">
              <option value="SM57" />
              <option value="SM58" />
              <option value="e609" />
              <option value="e906" />
              <option value="Beta57" />
              <option value="Beta58" />
              <option value="D112" />
              <option value="Beta52" />
              <option value="Beta91" />
              <option value="KSM32" />
              <option value="C414" />
              <option value="DI" />
              <option value="MD421" />
              <option value="RE20" />
              <option value="AT2020" />
            </datalist>
            <datalist id="stand-types">
              <option value={t("stands.boom")} />
              <option value={t("stands.short")} />
              <option value={t("stands.none")} />
              <option value={t("stands.clip")} />
              <option value={t("stands.internal")} />
            </datalist>
          </>
        )}
      </section>

      {/* Stage Plot */}
      <section className="border-t border-border pt-5">
        <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-extrabold uppercase leading-none">
          <svg
            className="h-5 w-5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
            />
          </svg>
          {t("stagePlot")}
        </h2>
        <TechRiderStagePlot
          musicians={musicians}
          stageElements={stageElements}
          onUpdateMusicianPosition={updateMusicianPosition}
          onUpdateElementPosition={updateElementPosition}
          onAddElement={addStageElement}
          onRemoveElement={removeStageElement}
          readOnly={!canEdit}
        />
      </section>

      {/* General notes */}
      <section className="border-t border-border pt-5">
        <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-extrabold uppercase leading-none">
          <svg
            className="h-5 w-5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {t("generalNotes")}
        </h2>
        <textarea
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder={t("generalPlaceholder")}
          rows={4}
          className={`${inputClasses} resize-y`}
          disabled={!canEdit}
        />
      </section>

      {/* Save button */}
      {canEdit && (
        <div className="sticky bottom-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-md transition-all ${
              saved
                ? "bg-success text-success-foreground"
                : "bg-primary text-primary-foreground hover:opacity-90"
            } disabled:opacity-50`}
          >
            {saving ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t("saving")}

              </>
            ) : saved ? (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {t("saved")}

              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                {t("save")}

              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
