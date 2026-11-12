interface RatingStarsProps {
  value: number;
  max?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (value: number) => void;
}

export function RatingStars({
  value,
  max = 5,
  size = 16,
  interactive = false,
  onChange,
}: RatingStarsProps) {
  return (
    <div className="flex items-center gap-0.5" role={interactive ? 'radiogroup' : 'img'}>
      {Array.from({ length: max }, (_, index) => {
        const starValue = index + 1;
        const filled = starValue <= Math.round(value);
        const star = (
          <svg
            key={starValue}
            width={size}
            height={size}
            viewBox="0 0 20 20"
            fill={filled ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.4"
            className={filled ? 'text-white' : 'text-mid-gray'}
            aria-hidden="true"
          >
            <path d="M10 1.6l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8L10 1.6z" />
          </svg>
        );

        if (!interactive) return star;

        return (
          <button
            key={starValue}
            type="button"
            role="radio"
            aria-checked={starValue === Math.round(value)}
            aria-label={`${starValue} de ${max}`}
            className="hover:text-white btn-nintendo-animation"
            onClick={() => onChange?.(starValue)}
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}
