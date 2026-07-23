/**
 * Utilitaire de pagination et d'optimisation de requêtes pour Supabase & PostgREST.
 * Évite le N+1 et fournit un découpage de résultats uniforme.
 */

export type PaginationParams = {
  page?: number;
  pageSize?: number;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function getPaginationRange({ page = 1, pageSize = 20 }: PaginationParams) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;
  return { from, to, page: safePage, pageSize: safePageSize };
}

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / Math.max(1, pageSize)),
  };
}
