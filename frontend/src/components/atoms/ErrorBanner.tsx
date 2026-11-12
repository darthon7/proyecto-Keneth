interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] bg-graphite px-4 py-3 text-body-sm text-[#ff9c9c] surface-hairline"
    >
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="font-semibold text-white underline underline-offset-4"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
