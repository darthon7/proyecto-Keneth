import axios, { AxiosError } from 'axios';

export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const AUTH_TOKEN_STORAGE_KEY = 'keneth.authToken';

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    return token && token.trim().length > 0 ? token : null;
  } catch {
    return null;
  }
}

export function setStoredAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } catch {
    // Ignorar errores de almacenamiento (modo privado / cuota excedida)
  }
}

export function clearStoredAuthToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    // Ignorar errores de almacenamiento
  }
}

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

function notifyUnauthorized(): void {
  for (const listener of unauthorizedListeners) {
    listener();
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('keneth:unauthorized'));
  }
}

/** Error normalizado de la API: siempre con un mensaje legible en español. */
export class ApiError extends Error {
  readonly status: number;
  readonly details: string[];

  constructor(message: string, status: number, details: string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  400: 'La solicitud contiene datos inválidos.',
  401: 'Necesitas iniciar sesión para continuar.',
  403: 'No tienes permisos para realizar esta acción.',
  404: 'El recurso solicitado no existe.',
  409: 'El recurso ya existe.',
  500: 'Error interno del servidor. Inténtalo de nuevo.',
};

function extractDetails(data: unknown): string[] {
  if (!data || typeof data !== 'object') return [];
  const message = (data as { message?: unknown }).message;
  if (Array.isArray(message)) return message.map((item) => String(item));
  if (typeof message === 'string') return [message];
  return [];
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<unknown>;
    const status = axiosError.response?.status ?? 0;
    const details = extractDetails(axiosError.response?.data);

    if (!axiosError.response) {
      return new ApiError(
        'No se pudo conectar con el servidor. Verifica que el backend esté ejecutándose.',
        0,
      );
    }

    const fallback = STATUS_MESSAGES[status] ?? 'Ocurrió un error inesperado.';
    return new ApiError(details[0] ?? fallback, status, details);
  }

  return new ApiError('Ocurrió un error inesperado.', 0);
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredAuthToken();
  if (token && config.headers) {
    if (typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      (config.headers as Record<string, unknown>).Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

function hasAuthorizationHeader(headers: unknown): boolean {
  if (!headers || typeof headers !== 'object') return false;
  const candidate = headers as {
    get?: (name: string) => unknown;
    Authorization?: unknown;
    authorization?: unknown;
  };
  if (typeof candidate.get === 'function') {
    return Boolean(candidate.get('Authorization') ?? candidate.get('authorization'));
  }
  return Boolean(candidate.Authorization ?? candidate.authorization);
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const url = error.config?.url ?? '';
      const hadAuth = hasAuthorizationHeader(error.config?.headers);
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');

      if (status === 401 && hadAuth && !isAuthEndpoint) {
        clearStoredAuthToken();
        notifyUnauthorized();
      }
    }
    return Promise.reject(toApiError(error));
  },
);

/** Extrae un mensaje de error utilizable por la UI. */
export function errorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
