const PAGE_SIZE = 1000;

/**
 * Toutes les lignes d'une requete, page par page.
 *
 * PostgREST plafonne une reponse (1000 lignes par defaut) sans le signaler.
 * La requete doit trier sur une colonne unique, sinon une ligne peut sauter
 * d'une page a l'autre. Une erreur est levee : mieux vaut rien que des
 * donnees incompletes prises pour le tout.
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}
