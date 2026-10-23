/**
 * Une jointure Supabase (`song:songs(*)`) rend un objet ou un tableau
 * selon la relation, ou rien si la RLS masque la ligne : on la ramene a
 * un objet.
 */
export type Joined<T, K extends keyof T> = Omit<T, K> & { [P in K]: T[P] | T[P][] | null };

export function one<T>(value: T | T[] | null | undefined): T {
  return (Array.isArray(value) ? value[0] : value) as T;
}
