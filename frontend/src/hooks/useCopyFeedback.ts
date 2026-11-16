import { useCallback, useEffect, useRef, useState } from 'react';

export function useCopyFeedback<T = number | string>(timeoutMs = 2000) {
  const [copiedId, setCopiedId] = useState<T | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const copy = useCallback(
    async (id: T, text: string, onError?: () => void) => {
      try {
        await navigator.clipboard?.writeText(text);
        setCopiedId(id);
        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current);
        }
        timerRef.current = window.setTimeout(() => {
          setCopiedId((current) => (current === id ? null : current));
          timerRef.current = null;
        }, timeoutMs);
      } catch {
        onError?.();
      }
    },
    [timeoutMs],
  );

  return { copiedId, copy };
}
