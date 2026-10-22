import { Banknote, CreditCard, HandCoins, QrCode, ArrowLeftRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PayMethod } from "../types";

export const PAY_METHODS: { id: PayMethod; label: string; icon: LucideIcon }[] = [
  { id: "efectivo", label: "Efectivo", icon: Banknote },
  { id: "debito", label: "Débito / Crédito", icon: CreditCard },
  { id: "mercadopago", label: "Mercado Pago / QR", icon: QrCode },
  { id: "transferencia", label: "Transferencia", icon: ArrowLeftRight },
  { id: "fiado", label: "Fiado", icon: HandCoins },
];

export const PAY_LABEL = Object.fromEntries(PAY_METHODS.map((m) => [m.id, m.label])) as Record<PayMethod, string>;

// Medios con los que se cobra de verdad (el fiado queda como deuda).
export const COLLECT_METHODS = PAY_METHODS.filter((m) => m.id !== "fiado");
