"use client";

import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { fetchServerCart, mergeStoredCart, resolveServerVariantId, updateServerCartItem } from "@/features/cart/api/cart-client";
import type { ServerCart } from "@/features/cart/model/cart-contracts";
import {
  findCartVariant,
  GUEST_CART_STORAGE_KEY,
  normalizeGuestCart,
  setGuestCartQuantity,
  type GuestCartLine,
} from "@/features/cart/model/guest-cart";
import { CartDrawer } from "@/features/cart/ui/CartDrawer";
import { fetchStorefrontProducts } from "@/features/catalog/api/catalog-client";
import { mockProducts } from "@/features/catalog/model/mock-products";
import { AUTH_SESSION_CHANGED_EVENT } from "@/shared/constants/auth-events";
import type { CatalogProduct } from "@/shared/types/catalog";

const MERGE_KEY_STORAGE_KEY = "aqverine-cart-merge-key-v1";
const CART_QUERY_KEY = ["cart", "current"] as const;
const SERVER_CART_ENABLED = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

interface CartContextValue {
  lines: readonly GuestCartLine[];
  catalogProducts: readonly CatalogProduct[];
  serverCart: ServerCart | null;
  serverEnabled: boolean;
  serverUnavailable: boolean;
  count: number;
  hydrated: boolean;
  syncing: boolean;
  error: string;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (variantId: string, quantity?: number, product?: CatalogProduct) => Promise<boolean>;
  setQuantity: (variantId: string, quantity: number) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

function readStoredCart(products: readonly CatalogProduct[]): GuestCartLine[] {
  try {
    const stored = window.localStorage.getItem(GUEST_CART_STORAGE_KEY);
    return stored ? normalizeGuestCart(JSON.parse(stored) as unknown, products) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  }));
  return <QueryClientProvider client={queryClient}><CartProviderContent>{children}</CartProviderContent></QueryClientProvider>;
}

function CartProviderContent({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [guestLines, setGuestLines] = useState<GuestCartLine[]>([]);
  const [seenProducts, setSeenProducts] = useState<CatalogProduct[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const merging = useRef(false);
  const cartQuery = useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: fetchServerCart,
    enabled: SERVER_CART_ENABLED,
    staleTime: 0,
  });
  const catalogQuery = useQuery({
    queryKey: ["catalog", "storefront"],
    queryFn: fetchStorefrontProducts,
    enabled: SERVER_CART_ENABLED,
    staleTime: 30_000,
  });
  const catalogProducts = [...seenProducts, ...(catalogQuery.data ?? mockProducts).filter(
    (product) => !seenProducts.some((seen) => seen.slug === product.slug),
  )];
  const refetchCart = cartQuery.refetch;

  useEffect(() => {
    if (hydrated) return;
    if (SERVER_CART_ENABLED && catalogQuery.isPending) return;
    const availableProducts = catalogQuery.data ?? mockProducts;
    const timer = window.setTimeout(() => {
      setGuestLines((current) => normalizeGuestCart([...readStoredCart(availableProducts), ...current], availableProducts));
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [catalogQuery.data, catalogQuery.isPending, hydrated]);

  useEffect(() => {
    const availableProducts = catalogQuery.data ?? mockProducts;
    const onStorage = () => setGuestLines(readStoredCart(availableProducts));
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, [catalogQuery.data]);

  useEffect(() => {
    if (!SERVER_CART_ENABLED) return;
    const onSessionChanged = () => {
      setError("");
      void refetchCart();
    };
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, onSessionChanged);
    return () => window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, onSessionChanged);
  }, [refetchCart]);

  useEffect(() => {
    if (!hydrated || !cartQuery.data || guestLines.length === 0 || merging.current) return;
    merging.current = true;
    const start = window.setTimeout(() => {
      setSyncing(true);
      const storedKey = window.localStorage.getItem(MERGE_KEY_STORAGE_KEY);
      const mergeKey = storedKey ?? window.crypto.randomUUID();
      if (!storedKey) window.localStorage.setItem(MERGE_KEY_STORAGE_KEY, mergeKey);
      void mergeStoredCart(mergeKey, guestLines.map((line) => ({ sku: line.variantId, quantity: line.quantity })))
        .then((result) => {
          queryClient.setQueryData(CART_QUERY_KEY, result.cart);
          window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
          window.localStorage.removeItem(MERGE_KEY_STORAGE_KEY);
          setGuestLines([]);
          setError(result.skipped.length || result.adjusted.length
            ? "Корзина обновлена по актуальным остаткам. Проверьте количество товаров."
            : "");
        })
        .catch(() => setError("Не удалось перенести корзину. Повторите вход или обновите страницу."))
        .finally(() => { merging.current = false; setSyncing(false); });
    }, 0);
    return () => window.clearTimeout(start);
  }, [cartQuery.data, guestLines, hydrated, queryClient]);

  const serverCart = cartQuery.data && guestLines.length === 0 ? cartQuery.data : null;
  const lines = serverCart
    ? serverCart.items.map((item) => ({ variantId: item.sku, quantity: item.quantity }))
    : guestLines;

  useEffect(() => {
    if (!hydrated || serverCart) return;
    window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(guestLines));
  }, [guestLines, hydrated, serverCart]);

  const addItem = async (sku: string, quantity = 1, product?: CatalogProduct) => {
    const availableProducts = product
      ? [product, ...catalogProducts.filter((known) => known.slug !== product.slug)] : catalogProducts;
    const match = findCartVariant(sku, availableProducts);
    if (!match || quantity < 1) return false;
    if (product) setSeenProducts((current) => current.some((known) => known.slug === product.slug) ? current : [...current, product]);
    setError("");
    if (serverCart) {
      try {
        const current = serverCart.items.find((item) => item.sku === sku);
        const variantId = current?.variantId ?? await resolveServerVariantId(match.product.slug, sku);
        const next = await updateServerCartItem(variantId, (current?.quantity ?? 0) + quantity);
        queryClient.setQueryData(CART_QUERY_KEY, next);
        setIsOpen(true);
        return true;
      } catch {
        setError("Не удалось добавить товар. Проверьте актуальный остаток.");
        return false;
      }
    }
    const current = guestLines.find((line) => line.variantId === sku)?.quantity ?? 0;
    if (current + quantity > match.variant.stock) return false;
    setGuestLines((previous) => setGuestCartQuantity(previous, sku, current + quantity, availableProducts));
    setIsOpen(true);
    return true;
  };

  const setQuantity = async (sku: string, quantity: number) => {
    setError("");
    if (serverCart) {
      const variantId = serverCart.items.find((item) => item.sku === sku)?.variantId;
      if (!variantId) return;
      try {
        queryClient.setQueryData(CART_QUERY_KEY, await updateServerCartItem(variantId, quantity));
      } catch {
        setError("Не удалось изменить количество. Обновите корзину и попробуйте снова.");
      }
      return;
    }
    setGuestLines((previous) => setGuestCartQuantity(previous, sku, quantity, catalogProducts));
  };

  const count = serverCart?.count ?? lines.reduce((sum, line) => sum + line.quantity, 0);
  return (
    <CartContext.Provider value={{
      lines, catalogProducts, serverCart, serverEnabled: SERVER_CART_ENABLED, serverUnavailable: cartQuery.isError,
      count, hydrated, syncing: syncing || (SERVER_CART_ENABLED && cartQuery.isLoading),
      error: error || (cartQuery.isError ? "Серверная корзина временно недоступна." : ""), isOpen,
      openCart: () => setIsOpen(true), closeCart: () => setIsOpen(false), addItem, setQuantity,
    }}>
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
