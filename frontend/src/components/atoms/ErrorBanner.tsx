interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#2a1318] border border-rose-500/30 px-4 py-3 text-xs sm:text-sm text-rose-300 shadow-md"
    >
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span>{message}</span>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="font-bold text-white hover:text-rose-200 underline underline-offset-4 text-xs transition-colors"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
