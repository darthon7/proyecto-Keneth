export interface PaginationOptions {
  limit?: number | string;
  offset?: number | string;
}

export function normalizePagination(options?: PaginationOptions): {
  take: number;
  skip: number;
} {
  const take = Math.floor(
    Math.min(Math.max(Number(options?.limit) || 100, 1), 200),
  );
  const parsedOffset = Number(options?.offset);
  const skip =
    Number.isFinite(parsedOffset) && parsedOffset > 0
      ? Math.floor(parsedOffset)
      : 0;
  return { take, skip };
}
