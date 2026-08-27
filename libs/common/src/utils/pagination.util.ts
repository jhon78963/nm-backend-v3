export interface PaginatedResult<T> {
  data: T[];
  paginate: { total: number; pages: number };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
): PaginatedResult<T> {
  const pages = total > 0 ? Math.ceil(total / limit) : 0;
  return { data, paginate: { total, pages } };
}

export function parsePagination(query: Record<string, string | undefined>): {
  page: number;
  limit: number;
  search?: string;
} {
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const limit = Math.min(200, Math.max(1, Number(query.limit ?? 10) || 10));
  const search = query.search?.trim() || undefined;
  return { page, limit, search };
}
