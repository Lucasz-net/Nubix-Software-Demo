import type { Sale } from "../types";

export const saleProfit = (s: Sale) => s.items.reduce((sum, i) => sum + i.qty * (i.price - i.cost), 0);

export const isActive = (s: Sale) => !s.voidedAt;

export const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// Inicio del día de hace `n` días (0 = hoy).
export const daysBack = (n: number) => {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - n);
  return d;
};

export function totalsOf(sales: Sale[]) {
  const active = sales.filter(isActive);
  const total = active.reduce((s, x) => s + x.total, 0);
  const profit = active.reduce((s, x) => s + saleProfit(x), 0);
  return {
    total,
    profit,
    count: active.length,
    avg: active.length ? Math.round(total / active.length) : 0,
    voided: sales.length - active.length,
  };
}
