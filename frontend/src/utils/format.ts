const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatCurrency(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateFormatter.format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateTimeFormatter.format(date);
}

/** Convierte un enum del backend (UPPER_SNAKE) a texto legible (Upper Snake). */
export function humanizeEnum(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

/** Convierte un valor de <input type="datetime-local"> a ISO 8601. */
export function localDateTimeToIso(value: string): string {
  if (!value) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

/** Convierte un valor ISO a formato apto para <input type="datetime-local">. */
export function isoToLocalDateTime(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/** Convierte una fecha ISO a formato apto para <input type="date">. */
export function isoToDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

/** Devuelve el inicio del día actual en hora local (00:00:00.000). */
export function getStartOfToday(referenceDate: Date = new Date()): Date {
  return new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    0,
    0,
    0,
    0,
  );
}

/** Devuelve el mínimo permitido para <input type="datetime-local"> correspondiente al inicio de hoy. */
export function getTodayLocalDateTimeMin(referenceDate: Date = new Date()): string {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${referenceDate.getFullYear()}-${pad(referenceDate.getMonth() + 1)}-${pad(referenceDate.getDate())}T00:00`;
}

/** Devuelve el mínimo permitido para <input type="date"> correspondiente a hoy. */
export function getTodayLocalDateMin(referenceDate: Date = new Date()): string {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${referenceDate.getFullYear()}-${pad(referenceDate.getMonth() + 1)}-${pad(referenceDate.getDate())}`;
}

/** Indica si una fecha (ISO o local) es anterior al inicio del día de hoy. */
export function isBeforeToday(
  value: string | Date,
  referenceDate: Date = new Date(),
): boolean {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < getStartOfToday(referenceDate).getTime();
}
