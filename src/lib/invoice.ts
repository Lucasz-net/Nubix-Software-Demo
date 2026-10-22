import type { FiscalSettings, Invoice, InvoiceLetter, InvoiceTarget, Sale } from "../types";
import { formatMoney, splitIva } from "./format";

// Facturación electrónica SIMULADA: los números, el CAE y el QR siguen el formato de ARCA,
// pero nada se envía a ARCA y los comprobantes no tienen validez fiscal.

export type InvoiceKind = "factura" | "nc";

// Códigos de comprobante de ARCA.
const CODES: Record<InvoiceKind, Record<InvoiceLetter, number>> = {
  factura: { A: 1, B: 6, C: 11 },
  nc: { A: 3, B: 8, C: 13 },
};

export const invoiceCode = (letter: InvoiceLetter, kind: InvoiceKind) => CODES[kind][letter];

export const KIND_LABEL: Record<InvoiceKind, string> = { factura: "Factura", nc: "Nota de crédito" };

const pad = (n: number, len: number) => String(n).padStart(len, "0");

export const formatInvoiceNumber = (inv: Invoice) => `${pad(inv.pos, 5)}-${pad(inv.number, 8)}`;

export const invoiceLabel = (inv: Invoice, kind: InvoiceKind = "factura") =>
  `${kind === "factura" ? "Factura" : "N. crédito"} ${inv.letter} ${formatInvoiceNumber(inv)}`;

export const CONSUMIDOR_FINAL: InvoiceTarget = { docType: 99, docNumber: "0" };

// Monotributo: siempre Factura C. Responsable Inscripto: A a otro inscripto (con CUIT), B al resto.
export const letterFor = (fiscal: FiscalSettings, target: InvoiceTarget): InvoiceLetter =>
  fiscal.condition === "monotributo" ? "C" : target.letter === "A" && target.docType === 80 ? "A" : "B";

// Próximo número de la serie (letra + tipo) en el punto de venta.
export function nextNumber(sales: Sale[], letter: InvoiceLetter, kind: InvoiceKind, pos: number) {
  let max = 0;
  for (const s of sales) {
    const inv = kind === "factura" ? s.invoice : s.creditNote;
    if (inv && inv.letter === letter && inv.pos === pos && inv.number > max) max = inv.number;
  }
  return max + 1;
}

// CAE de 14 dígitos con vencimiento a 10 días, como los que devuelve ARCA.
export function makeCae(rnd: () => number = Math.random) {
  let cae = String(7 + Math.floor(rnd() * 3));
  for (let i = 0; i < 13; i++) cae += Math.floor(rnd() * 10);
  return cae;
}

export function caeDueOf(inv: Invoice) {
  const due = new Date(inv.date);
  due.setDate(due.getDate() + 10);
  return due;
}

export function issue(
  sales: Sale[],
  fiscal: FiscalSettings,
  kind: InvoiceKind,
  letter: InvoiceLetter,
  target: InvoiceTarget,
  date: string,
  rnd?: () => number,
): Invoice {
  return {
    letter,
    pos: fiscal.pos,
    number: nextNumber(sales, letter, kind, fiscal.pos),
    date,
    cae: makeCae(rnd),
    docType: target.docType,
    docNumber: target.docType === 99 ? "0" : target.docNumber,
    customerName: target.customerName?.trim() || undefined,
  };
}

// URL del QR con el formato oficial de ARCA (https://www.afip.gob.ar/fe/qr/): JSON en base64.
export function qrUrl(fiscal: FiscalSettings, inv: Invoice, kind: InvoiceKind, total: number) {
  const data = {
    ver: 1,
    fecha: inv.date.slice(0, 10),
    cuit: Number(fiscal.cuit),
    ptoVta: inv.pos,
    tipoCmp: invoiceCode(inv.letter, kind),
    nroCmp: inv.number,
    importe: total,
    moneda: "PES",
    ctz: 1,
    tipoDocRec: inv.docType,
    nroDocRec: Number(inv.docNumber),
    tipoCodAut: "E",
    codAut: Number(inv.cae),
  };
  return `https://www.afip.gob.ar/fe/qr/?p=${btoa(JSON.stringify(data))}`;
}

// --- CUIT y documentos ---

export const onlyDigits = (s: string) => s.replace(/\D/g, "");

export function cuitIsValid(raw: string) {
  const d = onlyDigits(raw);
  if (d.length !== 11) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((s, w, i) => s + w * Number(d[i]), 0);
  const check = 11 - (sum % 11);
  return (check === 11 ? 0 : check) === Number(d[10]);
}

export const formatCuit = (raw: string) => {
  const d = onlyDigits(raw);
  return d.length === 11 ? `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}` : raw;
};

export const formatDni = (raw: string) => Number(onlyDigits(raw)).toLocaleString("es-AR");

export const receiverLabel = (inv: Invoice) =>
  inv.docType === 80 ? `CUIT ${formatCuit(inv.docNumber)}` : inv.docType === 96 ? `DNI ${formatDni(inv.docNumber)}` : "Consumidor final";

export const CONDITION_LABEL: Record<FiscalSettings["condition"], string> = {
  monotributo: "Responsable Monotributo",
  ri: "IVA Responsable Inscripto",
};

// Topes anuales de referencia por categoría del monotributo. ARCA los actualiza dos veces por año:
// en la configuración se pueden corregir con el valor vigente.
export const MONOTRIBUTO_LIMITS: Record<string, number> = {
  A: 8_992_597,
  B: 13_175_201,
  C: 18_473_166,
  D: 22_934_610,
  E: 26_977_793,
  F: 33_809_379,
  G: 40_431_835,
  H: 61_344_853,
  I: 68_664_410,
  J: 78_632_948,
  K: 94_805_682,
};

// IVA discriminado (A) o contenido (B, Ley 27.743 de Transparencia Fiscal). La C no lo muestra.
export const ivaOf = (inv: Invoice, total: number) => (inv.letter === "C" ? null : splitIva(total));

export function whatsappText(fiscal: FiscalSettings, inv: Invoice, kind: InvoiceKind, total: number) {
  return [
    `*${fiscal.businessName}*`,
    `${KIND_LABEL[kind]} ${inv.letter} N° ${formatInvoiceNumber(inv)}`,
    `Fecha: ${new Date(inv.date).toLocaleDateString("es-AR")}`,
    `Total: ${formatMoney(total)}`,
    `CAE: ${inv.cae}`,
    "",
    `Ver comprobante: ${qrUrl(fiscal, inv, kind, total)}`,
    "",
    "_Comprobante de demostración: simulación sin validez fiscal._",
  ].join("\n");
}
