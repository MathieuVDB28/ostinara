"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { bandPosteLabel } from "@/lib/instruments";
import { setMySetlistSongStatus } from "@/lib/actions/setlist-member-readiness";
import type { SetlistMemberCell, SetlistMemberReadiness, SongStatus } from "@/types";

const STATUSES: SongStatus[] = ["want_to_learn", "learning", "mastered"];

/** Le statut se lit sans la couleur : une coche, un pourcentage, un rond vide, un tiret. */
function CellMark({ cell }: { cell?: SetlistMemberCell }) {
  if (!cell?.in_library) return <span className="text-muted-foreground">–</span>;
  if (cell.status === "mastered") return <Icon name="check" className="mx-auto h-4 w-4 text-success" />;
  if (cell.status === "learning") {
    return <span className="tabular text-xs font-semibold">{cell.progress_percent ?? 0}%</span>;
  }
  return <span aria-hidden className="mx-auto block h-3 w-3 rounded-full border-2 border-muted-foreground" />;
}

interface SetlistMemberReadinessPanelProps {
  readiness: SetlistMemberReadiness;
  /** Groupe en lecture seule : on regarde, on ne change rien. */
  readOnly?: boolean;
}

/** Morceaux en lignes, musiciens en colonnes : qui en est ou avant la repete. */
export function SetlistMemberReadinessPanel({
  readiness: initialReadiness,
  readOnly = false,
}: SetlistMemberReadinessPanelProps) {
  const t = useTranslations("rehearsals.memberReadiness");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const [readiness, setReadiness] = useState(initialReadiness);
  // La setlist a change cote serveur (morceau ajoute, retire) : on repart de la.
  const [lastInitial, setLastInitial] = useState(initialReadiness);
  if (initialReadiness !== lastInitial) {
    setLastInitial(initialReadiness);
    setReadiness(initialReadiness);
  }
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (readiness.total === 0) return null;

  const me = readiness.current_user_id;
  const editingRow = readiness.rows.find((row) => row.item_id === editingItemId) ?? null;
  const editingCell = editingRow?.cells[me];

  const statusText = (cell?: SetlistMemberCell) => {
    if (!cell?.in_library || !cell.status) return t("notInLibrary");
    if (cell.status === "learning") {
      return t("learningPercent", { percent: cell.progress_percent ?? 0 });
    }
    return te(`songStatus.${cell.status}`);
  };

  const choose = (status: SongStatus) => {
    if (!editingRow) return;
    setError(null);
    startTransition(async () => {
      const result = await setMySetlistSongStatus(readiness.setlist_id, editingRow.item_id, status);
      if (!result.success) {
        setError(result.error ?? null);
        return;
      }
      if (result.readiness) setReadiness(result.readiness);
      setEditingItemId(null);
    });
  };

  return (
    <section aria-labelledby="setlist-member-readiness" className="my-8">
      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <h2
          id="setlist-member-readiness"
          className="font-display text-[13px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground"
        >
          {t("title")}
        </h2>
        <span className="tabular text-sm font-semibold">
          {t("readyCount", { ready: readiness.ready, total: readiness.total })}
        </span>
      </div>

      <div className="mt-1 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 bg-background py-2 pr-3 text-left text-xs font-semibold text-muted-foreground"
              >
                {t("song")}
              </th>
              {readiness.members.map((member) => (
                <th key={member.user_id} scope="col" className="min-w-[64px] px-1 py-2 text-center align-bottom font-normal">
                  <span className="mx-auto block max-w-[80px] truncate text-xs font-semibold">
                    {member.user_id === me ? t("you") : member.name}
                  </span>
                  <span className="mx-auto block max-w-[80px] truncate text-[11px] text-muted-foreground">
                    {bandPosteLabel(member, te)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {readiness.rows.map((row) => (
              <tr key={row.item_id} className="border-t border-border">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-background py-2 pr-3 text-left font-medium"
                >
                  {/* Une largeur fixe : max-w ne tient pas dans une cellule de tableau. */}
                  <span className="block w-[130px] truncate sm:w-[260px]" title={row.title}>
                    {row.title}
                  </span>
                  {row.artist && (
                    <span className="block w-[130px] truncate text-xs font-normal text-muted-foreground sm:w-[260px]">
                      {row.artist}
                    </span>
                  )}
                </th>
                {readiness.members.map((member) => {
                  const cell = row.cells[member.user_id];
                  const label = t("cellLabel", {
                    name: member.user_id === me ? t("you") : member.name,
                    song: row.title,
                    status: statusText(cell),
                  });

                  if (member.user_id === me && !readOnly) {
                    return (
                      <td key={member.user_id} className="p-0 text-center">
                        <button
                          type="button"
                          aria-label={label}
                          aria-expanded={editingItemId === row.item_id}
                          onClick={() => {
                            setError(null);
                            setEditingItemId(editingItemId === row.item_id ? null : row.item_id);
                          }}
                          className={`flex min-h-[44px] w-full items-center justify-center rounded-md transition-colors hover:bg-secondary ${
                            editingItemId === row.item_id ? "bg-secondary" : ""
                          }`}
                        >
                          <CellMark cell={cell} />
                        </button>
                      </td>
                    );
                  }

                  return (
                    <td key={member.user_id} className="py-2 text-center" title={statusText(cell)}>
                      <span className="sr-only">{label}</span>
                      <span aria-hidden>
                        <CellMark cell={cell} />
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingRow && (
        <div role="group" aria-label={t("editTitle", { song: editingRow.title })} className="mt-2 rounded-lg bg-secondary p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{t("editTitle", { song: editingRow.title })}</p>
              {!editingCell?.in_library && (
                <p className="mt-0.5 text-xs text-muted-foreground">{t("addHint")}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setEditingItemId(null)}
              aria-label={tc("close")}
              className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {STATUSES.map((status) => {
              const current = editingCell?.in_library && editingCell.status === status;
              return (
                <button
                  key={status}
                  type="button"
                  disabled={pending}
                  aria-pressed={Boolean(current)}
                  onClick={() => choose(status)}
                  className={`min-h-[44px] rounded-md px-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                    current ? "bg-foreground text-background" : "bg-background hover:bg-muted"
                  }`}
                >
                  {te(`songStatus.${status}`)}
                </button>
              );
            })}
          </div>
          {error && (
            <p role="alert" className="mt-2 text-xs font-semibold text-destructive">
              {error}
            </p>
          )}
        </div>
      )}

      <p className="mt-2 text-xs text-muted-foreground">{t("legend")}</p>
      {!readOnly && <p className="text-xs text-muted-foreground">{t("hint")}</p>}
    </section>
  );
}
