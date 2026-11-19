import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { gameEditionsExtraApi } from '@/api';

const STORAGE_KEY = 'keneth.cart';

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

interface CartContextValue {
  items: CartItem[];
  addItem: (gameEditionId: number, quantity?: number) => void;
  removeItem: (gameEditionId: number) => void;
  setQuantity: (gameEditionId: number, quantity: number) => void;
  clear: () => void;
  totalItems: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function normalizeQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(50, Math.max(1, Math.floor(quantity)));
}

function readStoredItems(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CartItem =>
        typeof item === 'object' &&
        item !== null &&
        Number.isInteger((item as CartItem).gameEditionId) &&
        (item as CartItem).gameEditionId >= 1 &&
        Number.isInteger((item as CartItem).quantity) &&
        (item as CartItem).quantity >= 1 &&
        (item as CartItem).quantity <= 50,
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readStoredItems);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((gameEditionId: number, quantity = 1) => {
    if (!Number.isInteger(gameEditionId) || gameEditionId < 1) return;
    const safeQuantity = normalizeQuantity(quantity);

    // Reservar claves en el backend para que el stock disminuya inmediatamente en tiempo real
    void gameEditionsExtraApi.reserve(gameEditionId, safeQuantity).catch(() => {
      // Ignora error si falla red, manteniendo resiliencia offline en UI local
    });

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
  }, []);

  const removeItem = useCallback((gameEditionId: number) => {
    setItems((current) => {
      const target = current.find((item) => item.gameEditionId === gameEditionId);
      if (target) {
        void gameEditionsExtraApi.release(gameEditionId, target.quantity).catch(() => {});
      }
      return current.filter((item) => item.gameEditionId !== gameEditionId);
    });
  }, []);

  const setQuantity = useCallback((gameEditionId: number, quantity: number) => {
    if (!Number.isInteger(gameEditionId) || gameEditionId < 1) return;
    const safeQuantity = normalizeQuantity(quantity);
    setItems((current) => {
      const existing = current.find((item) => item.gameEditionId === gameEditionId);
      if (existing) {
        const diff = safeQuantity - existing.quantity;
        if (diff > 0) {
          void gameEditionsExtraApi.reserve(gameEditionId, diff).catch(() => {});
        } else if (diff < 0) {
          void gameEditionsExtraApi.release(gameEditionId, Math.abs(diff)).catch(() => {});
        }
      }
      return current.map((item) =>
        item.gameEditionId === gameEditionId
          ? { ...item, quantity: safeQuantity }
          : item,
      );
    });
  }, []);

  const clear = useCallback(() => {
    // Al limpiar el carrito sin pagar, liberar las claves reservadas
    for (const item of items) {
      void gameEditionsExtraApi.release(item.gameEditionId, item.quantity).catch(() => {});
    }
    setItems([]);
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItem,
      removeItem,
      setQuantity,
      clear,
      totalItems: items.reduce((acc, item) => acc + item.quantity, 0),
    }),
    [items, addItem, removeItem, setQuantity, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart debe usarse dentro de CartProvider');
  return context;
}
