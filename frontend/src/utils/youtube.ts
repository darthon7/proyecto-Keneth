export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const vParam = url.searchParams.get('v');
    if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
      return vParam;
    }

    const segments = url.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (url.hostname.includes('youtu.be') && last && /^[a-zA-Z0-9_-]{11}$/.test(last)) {
      return last;
    }

    const embedIndex = segments.findIndex((s) => s === 'embed' || s === 'shorts');
    const candidate = embedIndex >= 0 ? segments[embedIndex + 1] : undefined;
    if (candidate && /^[a-zA-Z0-9_-]{11}$/.test(candidate)) {
      return candidate;
    }
  } catch {
    // No es URL válida
  }

  return null;
}
