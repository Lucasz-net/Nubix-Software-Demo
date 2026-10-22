import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  CartItem,
  CashState,
  Customer,
  CustomerMovement,
  PayMethod,
  Product,
  Sale,
  Screen,
} from "../types";
import { createSeed } from "../data/mock";
import { newPrice } from "../lib/pricing";
import type { Rounding } from "../lib/pricing";
import { summarizeSession } from "../lib/cash";

interface State {
  screen: Screen;
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  customerMovements: CustomerMovement[];
  cash: CashState;
  cart: CartItem[];

  setScreen: (s: Screen) => void;
  resetDemo: () => void;

  addProduct: (p: Omit<Product, "id">) => void;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  adjustPrices: (opts: { percent: number; category: string | null; rounding: Rounding }) => number;
  restock: (productId: string, qty: number) => void;

  addToCart: (productId: string) => void;
  changeQty: (productId: string, delta: number) => void;
  removeFromCart: (productId: string) => void;
  checkout: (method: PayMethod, customerId?: string) => Sale | null;

  voidSale: (saleId: string, reason: string) => { ok: true } | { ok: false; error: string };

  openCash: (opening: number) => void;
  closeCash: (counted: number) => void;
  addCashMovement: (type: "ingreso" | "egreso", amount: number, note: string) => void;

  addCustomer: (name: string, phone: string) => void;
  registerPayment: (customerId: string, amount: number, method: PayMethod) => boolean;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      screen: "dashboard",
      cart: [],
      ...createSeed(),

      setScreen: (screen) => set({ screen }),
      resetDemo: () => set({ ...createSeed(), cart: [] }),

      addProduct: (p) =>
        set((s) => ({ products: [{ ...p, id: crypto.randomUUID() }, ...s.products] })),
      updateProduct: (p) =>
        set((s) => ({ products: s.products.map((x) => (x.id === p.id ? p : x)) })),
      deleteProduct: (id) =>
        set((s) => ({
          products: s.products.filter((x) => x.id !== id),
          cart: s.cart.filter((c) => c.productId !== id),
        })),
      adjustPrices: ({ percent, category, rounding }) => {
        let changed = 0;
        set((s) => ({
          products: s.products.map((p) => {
            if (category && p.category !== category) return p;
            const price = newPrice(p.price, percent, rounding);
            if (price !== p.price) changed++;
            return { ...p, price };
          }),
        }));
        return changed;
      },
      restock: (productId, qty) =>
        set((s) => ({
          products: s.products.map((p) => (p.id === productId ? { ...p, stock: p.stock + qty } : p)),
        })),

      addToCart: (productId) =>
        set((s) => {
          const product = s.products.find((p) => p.id === productId);
          if (!product) return s;
          const existing = s.cart.find((c) => c.productId === productId);
          if ((existing?.qty ?? 0) >= product.stock) return s;
          return {
            cart: existing
              ? s.cart.map((c) => (c.productId === productId ? { ...c, qty: c.qty + 1 } : c))
              : [...s.cart, { productId, qty: 1 }],
          };
        }),
      changeQty: (productId, delta) =>
        set((s) => {
          const product = s.products.find((p) => p.id === productId);
          const max = product?.stock ?? Infinity;
          return {
            cart: s.cart
              .map((c) => (c.productId === productId ? { ...c, qty: Math.min(c.qty + delta, max) } : c))
              .filter((c) => c.qty > 0),
          };
        }),
      removeFromCart: (productId) =>
        set((s) => ({ cart: s.cart.filter((c) => c.productId !== productId) })),

      checkout: (method, customerId) => {
        const { cart, products, cash, sales } = get();
        if (!cash.current || cart.length === 0) return null;
        if (method === "fiado" && !customerId) return null;

        const items = cart.flatMap((c) => {
          const p = products.find((x) => x.id === c.productId);
          return p ? [{ productId: p.id, name: p.name, qty: c.qty, price: p.price, cost: p.cost }] : [];
        });
        const total = items.reduce((sum, i) => sum + i.qty * i.price, 0);
        const sale: Sale = {
          id: `V-${String(sales.length + 1).padStart(4, "0")}`,
          date: new Date().toISOString(),
          items,
          total,
          payment: method,
          customerId: method === "fiado" ? customerId : undefined,
        };

        set((s) => ({
          sales: [...s.sales, sale],
          cart: [],
          products: s.products.map((p) => {
            const c = cart.find((x) => x.productId === p.id);
            return c ? { ...p, stock: Math.max(0, p.stock - c.qty) } : p;
          }),
          customers:
            method === "fiado"
              ? s.customers.map((c) => (c.id === customerId ? { ...c, balance: c.balance + total } : c))
              : s.customers,
          customerMovements:
            method === "fiado" && customerId
              ? [
                  ...s.customerMovements,
                  {
                    id: crypto.randomUUID(),
                    customerId,
                    date: sale.date,
                    type: "compra",
                    amount: total,
                    method: "fiado",
                  },
                ]
              : s.customerMovements,
        }));
        return sale;
      },

      voidSale: (saleId, reason) => {
        const { sales, cash } = get();
        const sale = sales.find((x) => x.id === saleId);
        if (!sale) return { ok: false, error: "No se encontró la venta." };
        if (sale.voidedAt) return { ok: false, error: "La venta ya estaba anulada." };

        // Si el efectivo ya pasó por un turno cerrado, la devolución sale de la caja actual.
        const inCurrentShift = !!cash.current && new Date(sale.date) >= new Date(cash.current.openedAt);
        const refundFromDrawer = sale.payment === "efectivo" && !inCurrentShift;
        if (refundFromDrawer && !cash.current) {
          return { ok: false, error: "Abrí la caja para devolver el efectivo de esta venta." };
        }

        const now = new Date().toISOString();
        set((s) => ({
          sales: s.sales.map((x) => (x.id === saleId ? { ...x, voidedAt: now, voidReason: reason } : x)),
          products: s.products.map((p) => {
            const item = sale.items.find((i) => i.productId === p.id);
            return item ? { ...p, stock: p.stock + item.qty } : p;
          }),
          customers:
            sale.payment === "fiado" && sale.customerId
              ? s.customers.map((c) =>
                  c.id === sale.customerId ? { ...c, balance: Math.max(0, c.balance - sale.total) } : c,
                )
              : s.customers,
          customerMovements:
            sale.payment === "fiado" && sale.customerId
              ? [
                  ...s.customerMovements,
                  {
                    id: crypto.randomUUID(),
                    customerId: sale.customerId,
                    date: now,
                    type: "anulacion",
                    amount: sale.total,
                    method: "fiado",
                  },
                ]
              : s.customerMovements,
          cash:
            refundFromDrawer && s.cash.current
              ? {
                  ...s.cash,
                  current: {
                    ...s.cash.current,
                    movements: [
                      ...s.cash.current.movements,
                      { id: crypto.randomUUID(), date: now, type: "egreso", amount: sale.total, note: `Devolución ${sale.id}` },
                    ],
                  },
                }
              : s.cash,
        }));
        return { ok: true };
      },

      openCash: (opening) =>
        set((s) => {
          if (s.cash.current) return s;
          return {
            cash: {
              ...s.cash,
              current: {
                id: `C-${String(s.cash.history.length + 1).padStart(4, "0")}`,
                openedAt: new Date().toISOString(),
                opening,
                movements: [],
              },
            },
          };
        }),
      closeCash: (counted) =>
        set((s) => {
          const current = s.cash.current;
          if (!current) return s;
          const sum = summarizeSession(current, s.sales, s.customerMovements);
          return {
            cash: {
              current: null,
              history: [
                {
                  id: current.id,
                  openedAt: current.openedAt,
                  closedAt: new Date().toISOString(),
                  opening: current.opening,
                  expected: sum.expected,
                  counted,
                  collected: sum.collected,
                },
                ...s.cash.history,
              ],
            },
          };
        }),
      addCashMovement: (type, amount, note) =>
        set((s) => {
          if (!s.cash.current) return s;
          return {
            cash: {
              ...s.cash,
              current: {
                ...s.cash.current,
                movements: [
                  ...s.cash.current.movements,
                  { id: crypto.randomUUID(), date: new Date().toISOString(), type, amount, note },
                ],
              },
            },
          };
        }),

      addCustomer: (name, phone) =>
        set((s) => ({
          customers: [...s.customers, { id: crypto.randomUUID(), name, phone, balance: 0 }],
        })),
      registerPayment: (customerId, amount, method) => {
        const { customers, cash } = get();
        const customer = customers.find((c) => c.id === customerId);
        if (!customer || !cash.current || method === "fiado") return false;
        const paid = Math.min(amount, customer.balance);
        if (paid <= 0) return false;
        set((s) => ({
          customers: s.customers.map((c) => (c.id === customerId ? { ...c, balance: c.balance - paid } : c)),
          customerMovements: [
            ...s.customerMovements,
            {
              id: crypto.randomUUID(),
              customerId,
              date: new Date().toISOString(),
              type: "pago",
              amount: paid,
              method,
            },
          ],
        }));
        return true;
      },
    }),
    {
      name: "nubix-demo-v2",
      version: 2, // v2: ventas de 30 días + anulaciones (se descartan datos viejos de la demo)
      // Solo se guardan los datos de negocio, no el estado de UI.
      partialize: (s) => ({
        products: s.products,
        sales: s.sales,
        customers: s.customers,
        customerMovements: s.customerMovements,
        cash: s.cash,
      }),
    },
  ),
);
