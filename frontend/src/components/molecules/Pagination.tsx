interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav className={`flex items-center justify-center gap-2 ${className}`} aria-label="Paginación">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Página anterior"
        className="rounded-[4px] px-3 py-1.5 text-body-sm text-fog transition-colors hover:text-white disabled:opacity-40"
      >
        Anterior
      </button>

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          aria-current={page === currentPage ? 'page' : undefined}
          className={`h-8 w-8 rounded-[4px] text-body-sm transition-colors ${
            page === currentPage
              ? 'bg-white font-bold text-obsidian'
              : 'text-fog hover:text-white'
          }`}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Página siguiente"
        className="rounded-[4px] px-3 py-1.5 text-body-sm text-fog transition-colors hover:text-white disabled:opacity-40"
      >
        Siguiente
      </button>
    </nav>
  );
}
