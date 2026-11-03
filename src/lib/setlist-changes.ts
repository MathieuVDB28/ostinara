/**
 * Les gestes notes sur une setlist de groupe (`setlist_change_log`), et leur
 * resume en une ligne : « 3 ajouts, « Wonderwall » retire et ordre change ».
 *
 * Partage par la notification envoyee au groupe (serveur) et par
 * l'historique de la page de la setlist (client). Les textes vivent dans
 * `setlists.changes`.
 */

export type SetlistChangeKind =
  | "item_added"
  | "item_removed"
  | "item_updated"
  | "reordered"
  | "details_updated";

export interface SetlistChange {
  kind: SetlistChangeKind;
  item_label: string | null;
}

type ChangeKey = "addedOne" | "added" | "removedOne" | "removed" | "updated" | "reordered" | "details";

/** Le t() de `setlists.changes`, client ou serveur. */
export type ChangesT = (key: ChangeKey, values?: Record<string, string | number>) => string;

export function summarizeSetlistChanges(
  changes: SetlistChange[],
  t: ChangesT,
  intlLocale: string
): string {
  const of = (kind: SetlistChangeKind) => changes.filter((change) => change.kind === kind);
  const added = of("item_added");
  const removed = of("item_removed");
  const updated = of("item_updated");
  const parts: string[] = [];

  if (added.length === 1 && added[0].item_label) {
    parts.push(t("addedOne", { title: added[0].item_label }));
  } else if (added.length > 0) {
    parts.push(t("added", { count: added.length }));
  }
  if (removed.length === 1 && removed[0].item_label) {
    parts.push(t("removedOne", { title: removed[0].item_label }));
  } else if (removed.length > 0) {
    parts.push(t("removed", { count: removed.length }));
  }
  if (updated.length > 0) parts.push(t("updated", { count: updated.length }));
  if (of("reordered").length > 0) parts.push(t("reordered"));
  if (of("details_updated").length > 0) parts.push(t("details"));

  return new Intl.ListFormat(intlLocale, { type: "conjunction" }).format(parts);
}

/** Il y a 5 min, hier, il y a 3 jours… */
export function formatTimeAgo(date: string, intlLocale: string, now: number = Date.now()): string {
  // Jamais dans le futur : `now` peut dater du montage, la ligne d'apres.
  const seconds = Math.min(0, Math.round((new Date(date).getTime() - now) / 1000));
  const rtf = new Intl.RelativeTimeFormat(intlLocale, { numeric: "auto" });
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(0, "minute");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(seconds / (86400 * 30)), "month");
  return rtf.format(Math.round(seconds / (86400 * 365)), "year");
}
