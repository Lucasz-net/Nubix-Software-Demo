export type Screen = "dashboard" | "pos" | "inventory" | "cash" | "customers" | "restock" | "sales" | "invoices" | "stats";

export type Role = "admin" | "cajero";

export interface User {
  id: string;
  name: string;
  role: Role;
  pin: string;
}

export type PayMethod ="efectivo" | "debito" | "mercadopago" | "transferencia" | "fiado";

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
  userId?: string; // quién cobró
  voidedAt?: string; // ISO — si está, la venta fue anulada
  voidReason?: string;
  voidedBy?: string;
  invoice?: Invoice; // factura emitida por la venta
  creditNote?: Invoice; // nota de crédito que la anuló
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
  userId?: string;
}

export interface CashMovement {
  id: string;
  date: string;
  type: "ingreso" | "egreso";
  amount: number;
  note: string;
  userId?: string;
  authorizedBy?: string; // dueño que autorizó con su PIN (egresos de un cajero)
}

export interface CashSession {
  id: string;
  openedAt: string;
  opening: number;
  movements: CashMovement[];
  openedBy?: string;
}

export interface ClosedCash {
  id: string;
  openedAt: string;
  closedAt: string;
  opening: number;
  expected: number;
  counted: number;
  collected: number;
  openedBy?: string;
  closedBy?: string;
}

export interface CashState {
  current: CashSession | null;
  history: ClosedCash[];
}

// --- Facturación electrónica (simulada en la demo: no se envía a ARCA) ---

export type InvoiceLetter = "A" | "B" | "C";

// Tipo de documento del receptor, con los códigos de ARCA: 80 CUIT, 96 DNI, 99 consumidor final sin identificar.
export type DocType = 80 | 96 | 99;

export interface Invoice {
  letter: InvoiceLetter;
  pos: number; // punto de venta
  number: number;
  date: string; // ISO
  cae: string; // vence a los 10 días de la fecha (caeDueOf)
  docType: DocType;
  docNumber: string; // "0" para consumidor final
  customerName?: string;
}

export type FiscalCondition = "monotributo" | "ri";

export interface FiscalSettings {
  businessName: string;
  cuit: string; // 11 dígitos, sin guiones
  address: string;
  startDate: string; // inicio de actividades, AAAA-MM-DD
  condition: FiscalCondition;
  category: string; // categoría del monotributo (A a K)
  annualLimit: number; // tope de facturación anual de la categoría
  pos: number;
  autoInvoice: boolean; // facturar cada venta al cobrar
}

// Datos del receptor elegidos al cobrar.
export interface InvoiceTarget {
  letter?: InvoiceLetter; // solo para Responsable Inscripto: "A" a empresas
  docType: DocType;
  docNumber: string;
  customerName?: string;
}
