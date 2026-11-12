import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

const STORAGE_KEY = 'keneth.cart';

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
        typeof (item as CartItem).gameEditionId === 'number' &&
        typeof (item as CartItem).quantity === 'number',
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
    setItems((current) => {
      const existing = current.find((item) => item.gameEditionId === gameEditionId);
      if (existing) {
        return current.map((item) =>
          item.gameEditionId === gameEditionId
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }
      return [...current, { gameEditionId, quantity }];
    });
  }, []);

  const removeItem = useCallback((gameEditionId: number) => {
    setItems((current) => current.filter((item) => item.gameEditionId !== gameEditionId));
  }, []);

  const setQuantity = useCallback((gameEditionId: number, quantity: number) => {
    setItems((current) =>
      current.map((item) =>
        item.gameEditionId === gameEditionId
          ? { ...item, quantity: Math.max(1, quantity) }
          : item,
      ),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

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
