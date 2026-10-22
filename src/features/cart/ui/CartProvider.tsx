"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import {
  findCartVariant,
  GUEST_CART_STORAGE_KEY,
  normalizeGuestCart,
  setGuestCartQuantity,
  type GuestCartLine,
} from "@/features/cart/model/guest-cart";
import { CartDrawer } from "@/features/cart/ui/CartDrawer";

interface CartContextValue {
  lines: readonly GuestCartLine[];
  count: number;
  hydrated: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (variantId: string, quantity?: number) => boolean;
  setQuantity: (variantId: string, quantity: number) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<GuestCartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const readStoredCart = (): GuestCartLine[] => {
      try {
        const stored = window.localStorage.getItem(GUEST_CART_STORAGE_KEY);
        return stored ? normalizeGuestCart(JSON.parse(stored) as unknown) : [];
      } catch {
        return [];
      }
    };

    const timer = window.setTimeout(() => {
      setLines((current) => normalizeGuestCart([...readStoredCart(), ...current]));
      setHydrated(true);
    }, 0);
    const onStorage = () => setLines(readStoredCart());
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(lines));
  }, [hydrated, lines]);

  const addItem = (variantId: string, quantity = 1) => {
    const match = findCartVariant(variantId);
    if (!match || quantity < 1) return false;
    const current = lines.find((line) => line.variantId === variantId)?.quantity ?? 0;
    if (current + quantity > match.variant.stock) return false;
    setLines((previous) => setGuestCartQuantity(previous, variantId, current + quantity));
    setIsOpen(true);
    return true;
  };

  const count = lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        lines,
        count,
        hydrated,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
        addItem,
        setQuantity: (variantId, quantity) =>
          setLines((previous) => setGuestCartQuantity(previous, variantId, quantity)),
      }}
    >
      {children}
      <CartDrawer />
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("CartProvider is missing");
  return context;
}
