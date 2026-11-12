interface SpinnerProps {
  label?: string;
  className?: string;
}

export function Spinner({ label = 'Cargando…', className = '' }: SpinnerProps) {
  return (
    <div className={`flex items-center justify-center gap-3 py-10 text-[#475569] ${className}`}>
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-[#FF2A5F] border-t-transparent"
      />
      <span className="text-body-sm">{label}</span>
    </div>
  );
}
