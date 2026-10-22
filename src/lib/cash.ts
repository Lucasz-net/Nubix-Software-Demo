import type { CashSession, CustomerMovement, PayMethod, Sale } from "../types";

export function summarizeSession(session: CashSession, sales: Sale[], movements: CustomerMovement[]) {
  const since = new Date(session.openedAt).getTime();
  const byMethod: Record<PayMethod, number> = {
    efectivo: 0,
    debito: 0,
    mercadopago: 0,
    transferencia: 0,
    fiado: 0,
  };

  let salesCount = 0;
  let profit = 0;
  sales.forEach((s) => {
    if (s.voidedAt || new Date(s.date).getTime() < since) return;
    byMethod[s.payment] += s.total;
    salesCount++;
    s.items.forEach((i) => (profit += i.qty * (i.price - i.cost)));
  });

  // Cobros de deudas de clientes que entraron en este turno.
  let debtPayments = 0;
  movements.forEach((m) => {
    if (m.type !== "pago" || !m.method || new Date(m.date).getTime() < since) return;
    byMethod[m.method] += m.amount;
    debtPayments += m.amount;
  });

  const ingresos = session.movements.filter((m) => m.type === "ingreso").reduce((s, m) => s + m.amount, 0);
  const egresos = session.movements.filter((m) => m.type === "egreso").reduce((s, m) => s + m.amount, 0);
  const collected = byMethod.efectivo + byMethod.debito + byMethod.mercadopago + byMethod.transferencia;
  const expected = session.opening + byMethod.efectivo + ingresos - egresos;

  return { byMethod, salesCount, profit, debtPayments, ingresos, egresos, collected, expected };
}
