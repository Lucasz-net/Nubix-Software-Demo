const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export const formatMoney = (n: number) => money.format(n);

export const IVA_RATE = 0.21;

// Los precios ya incluyen IVA: separa el neto del impuesto contenido.
export function splitIva(total: number) {
  const net = Math.round(total / (1 + IVA_RATE));
  return { net, iva: total - net };
}

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

export const margin = (cost: number, price: number) =>
  price > 0 ? ((price - cost) / price) * 100 : 0;
