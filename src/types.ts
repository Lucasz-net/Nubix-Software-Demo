export type Screen = "dashboard" | "pos" | "inventory" | "cash" | "customers" | "restock" | "sales" | "stats";

export type PayMethod = "efectivo" | "debito" | "mercadopago" | "transferencia" | "fiado";

export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: string;
  cost: number;
  price: number; // precio final, IVA incluido
  stock: number;
  minStock: number;
}

export interface CartItem {
  productId: string;
  qty: number;
}

export interface SaleItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
  cost: number;
}

export interface Sale {
  id: string;
  date: string; // ISO
  items: SaleItem[];
  total: number;
  payment: PayMethod;
  customerId?: string;
  voidedAt?: string; // ISO — si está, la venta fue anulada
  voidReason?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  balance: number; // deuda actual (fiado)
}

export interface CustomerMovement {
  id: string;
  customerId: string;
  date: string;
  type: "compra" | "pago" | "anulacion";
  amount: number;
  method?: PayMethod;
}

export interface CashMovement {
  id: string;
  date: string;
  type: "ingreso" | "egreso";
  amount: number;
  note: string;
}

export interface CashSession {
  id: string;
  openedAt: string;
  opening: number;
  movements: CashMovement[];
}

export interface ClosedCash {
  id: string;
  openedAt: string;
  closedAt: string;
  opening: number;
  expected: number;
  counted: number;
  collected: number;
}

export interface CashState {
  current: CashSession | null;
  history: ClosedCash[];
}
