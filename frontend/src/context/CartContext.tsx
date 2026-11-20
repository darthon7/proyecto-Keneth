import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { errorMessage, gameEditionsExtraApi } from '@/api';

const STORAGE_KEY = 'keneth.cart';
export const CART_RESERVATION_TTL_MS = 3 * 60 * 1000;

export function clearStoredCart(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignorar errores de almacenamiento en entornos restringidos
  }
}

export interface CartItem {
  gameEditionId: number;
  quantity: number;
}

interface StoredCartPayload {
  items: CartItem[];
  expiresAt: number | null;
}

export interface ClearCartOptions {
  releaseReservations?: boolean;
}

interface CartContextValue {
  items: CartItem[];
  expiresAt: number | null;
  stockError: string | null;
  clearStockError: () => void;
  addItem: (gameEditionId: number, quantity?: number) => Promise<boolean>;
  removeItem: (gameEditionId: number) => void;
  setQuantity: (gameEditionId: number, quantity: number) => Promise<boolean>;
  clear: (options?: ClearCartOptions) => void;
  totalItems: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function normalizeQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(50, Math.max(1, Math.floor(quantity)));
}

function isValidCartItem(item: unknown): item is CartItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    Number.isInteger((item as CartItem).gameEditionId) &&
    (item as CartItem).gameEditionId >= 1 &&
    Number.isInteger((item as CartItem).quantity) &&
    (item as CartItem).quantity >= 1 &&
    (item as CartItem).quantity <= 50
  );
}

function readStoredCart(): StoredCartPayload {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], expiresAt: null };
    const parsed: unknown = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      const validItems = parsed.filter(isValidCartItem);
      return {
        items: validItems,
        expiresAt: validItems.length > 0 ? Date.now() + CART_RESERVATION_TTL_MS : null,
      };
    }

    if (typeof parsed === 'object' && parsed !== null) {
      const payload = parsed as { items?: unknown; expiresAt?: unknown };
      const validItems = Array.isArray(payload.items) ? payload.items.filter(isValidCartItem) : [];
      const expiresAt = typeof payload.expiresAt === 'number' && Number.isFinite(payload.expiresAt)
        ? payload.expiresAt
        : null;

      if (validItems.length === 0 || (expiresAt !== null && Date.now() >= expiresAt)) {
        return { items: [], expiresAt: null };
      }

      return {
        items: validItems,
        expiresAt: expiresAt ?? Date.now() + CART_RESERVATION_TTL_MS,
      };
    }

    return { items: [], expiresAt: null };
  } catch {
    return { items: [], expiresAt: null };
  }
}

function isHttpError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'response' in error && Boolean((error as { response?: unknown }).response);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [initialCart] = useState<StoredCartPayload>(readStoredCart);
  const [items, setItems] = useState<CartItem[]>(initialCart.items);
  const [expiresAt, setExpiresAt] = useState<number | null>(initialCart.expiresAt);
  const [stockError, setStockError] = useState<string | null>(null);
  const itemsRef = useRef<CartItem[]>(items);
  itemsRef.current = items;

  const clearStockError = useCallback(() => {
    setStockError(null);
  }, []);

  useEffect(() => {
    const payload: StoredCartPayload = {
      items,
      expiresAt: items.length > 0 ? expiresAt : null,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [items, expiresAt]);

  useEffect(() => {
    if (items.length === 0 || expiresAt === null) {
      return;
    }

    const remainingMs = expiresAt - Date.now();
    if (remainingMs <= 0) {
      setItems([]);
      setExpiresAt(null);
      return;
    }

    const timerId = window.setTimeout(() => {
      setItems([]);
      setExpiresAt(null);
    }, remainingMs);

    return () => window.clearTimeout(timerId);
  }, [items.length, expiresAt]);

  const addItem = useCallback(async (gameEditionId: number, quantity = 1): Promise<boolean> => {
    if (!Number.isInteger(gameEditionId) || gameEditionId < 1) return false;
    const safeQuantity = normalizeQuantity(quantity);
    setStockError(null);

    try {
      // Reservar claves en el backend antes de reflejar el incremento en el carrito
      await gameEditionsExtraApi.reserve(gameEditionId, safeQuantity);
    } catch (error) {
      if (isHttpError(error)) {
        setStockError(errorMessage(error));
        return false;
      }
      // Ignora error si falla red, manteniendo resiliencia offline en UI local
    }

    setExpiresAt(Date.now() + CART_RESERVATION_TTL_MS);

    setItems((current) => {
      const existing = current.find((item) => item.gameEditionId === gameEditionId);
      if (existing) {
        return current.map((item) =>
          item.gameEditionId === gameEditionId
            ? { ...item, quantity: normalizeQuantity(item.quantity + safeQuantity) }
            : item,
        );
      }
      return [...current, { gameEditionId, quantity: safeQuantity }];
    });
    return true;
  }, []);

  const removeItem = useCallback((gameEditionId: number) => {
    setStockError(null);
    setItems((current) => {
      const target = current.find((item) => item.gameEditionId === gameEditionId);
      if (target) {
        void gameEditionsExtraApi.release(gameEditionId, target.quantity).catch(() => {});
      }
      return current.filter((item) => item.gameEditionId !== gameEditionId);
    });
  }, []);

  const setQuantity = useCallback(async (gameEditionId: number, quantity: number): Promise<boolean> => {
    if (!Number.isInteger(gameEditionId) || gameEditionId < 1) return false;
    const safeQuantity = normalizeQuantity(quantity);
    setStockError(null);

    const existing = itemsRef.current.find((item) => item.gameEditionId === gameEditionId);
    if (existing) {
      const diff = safeQuantity - existing.quantity;
      if (diff > 0) {
        try {
          await gameEditionsExtraApi.reserve(gameEditionId, diff);
        } catch (error) {
          if (isHttpError(error)) {
            setStockError(errorMessage(error));
            return false;
          }
        }
      } else if (diff < 0) {
        void gameEditionsExtraApi.release(gameEditionId, Math.abs(diff)).catch(() => {});
      }
    }

    setExpiresAt(Date.now() + CART_RESERVATION_TTL_MS);

    setItems((current) =>
      current.map((item) =>
        item.gameEditionId === gameEditionId
          ? { ...item, quantity: safeQuantity }
          : item,
      ),
    );
    return true;
  }, []);

  const clear = useCallback((options?: ClearCartOptions) => {
    setStockError(null);
    const shouldRelease = options?.releaseReservations ?? true;
    if (shouldRelease) {
      // Al limpiar el carrito sin pagar, liberar las claves reservadas
      for (const item of items) {
        void gameEditionsExtraApi.release(item.gameEditionId, item.quantity).catch(() => {});
      }
    }
    setItems([]);
    setExpiresAt(null);
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      expiresAt,
      stockError,
      clearStockError,
      addItem,
      removeItem,
      setQuantity,
      clear,
      totalItems: items.reduce((acc, item) => acc + item.quantity, 0),
    }),
    [items, expiresAt, stockError, clearStockError, addItem, removeItem, setQuantity, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart debe usarse dentro de CartProvider');
  return context;
}
