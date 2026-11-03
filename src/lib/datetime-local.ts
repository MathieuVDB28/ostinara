/**
 * "2026-10-19T14:30" en heure locale, pour un <input type="datetime-local">.
 *
 * `toISOString()` donne l'heure UTC : en France, le champ afficherait une
 * ou deux heures de moins, et l'enregistrer reculerait la date d'autant
 * (`new Date("2026-10-19T14:30")` relit la valeur en heure locale).
 */
export function toLocalInput(value: string | Date | null | undefined = new Date()): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
