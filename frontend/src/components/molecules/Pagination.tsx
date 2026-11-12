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
        className="rounded-xl px-4 py-2 text-xs font-bold bg-[#FFFFFF] border border-[#E2E8F0] text-[#0F172A] hover:border-[#1E1B4B] hover:bg-[#F4F4F6] btn-nintendo-animation disabled:opacity-40 disabled:pointer-events-none"
      >
        Anterior
      </button>

      <div className="flex items-center gap-1.5">
        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? 'page' : undefined}
            className={`h-9 w-9 rounded-xl text-xs font-bold btn-nintendo-animation ${
              page === currentPage
                ? 'bg-[#FF2A5F] font-black text-white shadow-[0_4px_12px_rgba(255,42,95,0.3)]'
                : 'bg-[#FFFFFF] border border-[#E2E8F0] text-[#475569] hover:text-[#0F172A] hover:border-[#1E1B4B]'
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Página siguiente"
        className="rounded-xl px-4 py-2 text-xs font-bold bg-[#FFFFFF] border border-[#E2E8F0] text-[#0F172A] hover:border-[#1E1B4B] hover:bg-[#F4F4F6] btn-nintendo-animation disabled:opacity-40 disabled:pointer-events-none"
      >
        Siguiente
      </button>
    </nav>
  );
}
