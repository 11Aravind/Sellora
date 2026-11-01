"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import type { CartItem } from "../types";

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  isHydrated: boolean;
  addItem: (productId: string, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  tenantId,
  children,
}: {
  tenantId: string;
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const storageKey = useMemo(() => `cart:${tenantId}`, [tenantId]);

  // Hydrate from localStorage on client mount (deferred to avoid synchronous render cascading)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const validItems: CartItem[] = parsed
              .filter(
                (item) =>
                  item &&
                  typeof item.productId === "string" &&
                  typeof item.quantity === "number" &&
                  item.quantity > 0
              )
              .map((item) => ({
                productId: String(item.productId),
                quantity: Math.min(Math.max(1, Math.floor(item.quantity)), 100),
              }));
            setItems(validItems);
          }
        }
      } catch (e) {
        console.error("[CartProvider] Failed to load cart from localStorage", e);
      } finally {
        setIsHydrated(true);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [storageKey]);

  // Persist items to localStorage whenever they change after hydration
  useEffect(() => {
    if (!isHydrated) return;
    try {
      if (items.length === 0) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(items));
      }
    } catch (e) {
      console.error("[CartProvider] Failed to save cart to localStorage", e);
    }
  }, [items, isHydrated, storageKey]);

  const addItem = useCallback((productId: string, quantity: number = 1) => {
    if (!productId || quantity <= 0) return;
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.productId === productId);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = Math.min(100, updated[existingIndex].quantity + quantity);
        updated[existingIndex] = { ...updated[existingIndex], quantity: newQty };
        return updated;
      }
      return [...prev, { productId, quantity: Math.min(100, quantity) }];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((i) => i.productId !== productId);
      }
      return prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(100, Math.floor(quantity)) }
          : item
      );
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  const itemCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        isHydrated,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
