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
        className="rounded-xl px-4 py-2 text-xs font-bold bg-[#161a24] border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
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
            className={`h-9 w-9 rounded-xl text-xs font-bold transition-all ${
              page === currentPage
                ? 'bg-[#4f8eff] font-black text-[#00275e] shadow-[0_0_12px_rgba(79,142,255,0.4)]'
                : 'bg-[#161a24] border border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
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
        className="rounded-xl px-4 py-2 text-xs font-bold bg-[#161a24] border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
      >
        Siguiente
      </button>
    </nav>
  );
}
