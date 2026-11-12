interface PaginationDotsProps {
  total: number;
  current: number;
  onChange: (index: number) => void;
  className?: string;
}

export function PaginationDots({ total, current, onChange, className = '' }: PaginationDotsProps) {
  if (total <= 1) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {Array.from({ length: total }, (_, index) => {
        const isActive = index === current;
        return (
          <button
            key={index}
            type="button"
            aria-label={`Ir a la página ${index + 1}`}
            aria-current={isActive ? 'true' : undefined}
            onClick={() => onChange(index)}
            className={`h-2 w-2 rounded-full transition-colors ${
              isActive ? 'bg-white' : 'bg-fog/40 hover:bg-fog/70'
            }`}
          />
        );
      })}
    </div>
  );
}
