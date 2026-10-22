import QrCode from "./QrCode";
import { formatDateTime, formatMoney } from "../lib/format";
import {
  CONDITION_LABEL,
  KIND_LABEL,
  caeDueOf,
  formatCuit,
  formatInvoiceNumber,
  invoiceCode,
  ivaOf,
  qrUrl,
  receiverLabel,
} from "../lib/invoice";
import type { InvoiceKind } from "../lib/invoice";
import type { FiscalSettings, Sale } from "../types";

// El comprobante en formato ticket (80 mm): se ve igual en pantalla y al imprimir.
// Colores fijos en negro y gris para que salga bien en impresoras térmicas.
export default function InvoiceView({ sale, kind, fiscal }: { sale: Sale; kind: InvoiceKind; fiscal: FiscalSettings }) {
  const inv = kind === "factura" ? sale.invoice : sale.creditNote;
  if (!inv) return null;
  const iva = ivaOf(inv, sale.total);
  const row = "flex justify-between gap-3";

  return (
    <div className="relative mx-auto w-full max-w-[22rem] overflow-hidden bg-white px-5 py-5 font-mono text-[12px] leading-snug text-black">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="-rotate-[30deg] whitespace-nowrap text-5xl font-black tracking-widest text-black/[0.06]">SIMULACIÓN</span>
      </div>

      <p className="mb-3 border border-dashed border-black/60 py-1 text-center text-[10px] font-bold uppercase tracking-wider">
        Demo · Simulación sin validez fiscal
      </p>

      <div className="text-center">
        <p className="font-sans text-base font-extrabold uppercase">{fiscal.businessName}</p>
        <p>CUIT {formatCuit(fiscal.cuit)}</p>
        <p>{fiscal.address}</p>
        <p>{CONDITION_LABEL[fiscal.condition]}</p>
        <p>Inicio de actividades: {new Date(`${fiscal.startDate}T00:00`).toLocaleDateString("es-AR")}</p>
      </div>

      <div className="my-3 flex items-center gap-3 border-y border-black py-2.5">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center border-2 border-black">
          <span className="font-sans text-3xl font-black leading-none">{inv.letter}</span>
          <span className="text-[9px]">Cód. {String(invoiceCode(inv.letter, kind)).padStart(2, "0")}</span>
        </div>
        <div className="min-w-0">
          <p className="font-sans text-sm font-extrabold uppercase">{KIND_LABEL[kind]}</p>
          <p>N° {formatInvoiceNumber(inv)}</p>
          <p>{formatDateTime(inv.date)}</p>
        </div>
        <span className="ml-auto self-start text-[10px] font-bold">ORIGINAL</span>
      </div>

      <div className="space-y-0.5">
        <p><b>Cliente:</b> {inv.customerName ?? (inv.docType === 99 ? "Consumidor final" : "—")}</p>
        {inv.docType !== 99 && <p>{receiverLabel(inv)}</p>}
        {(inv.docType !== 99 || inv.customerName) && <p>{inv.letter === "A" ? "IVA Responsable Inscripto" : "Consumidor final"}</p>}
        {kind === "nc" && sale.invoice && (
          <p><b>Anula:</b> Factura {sale.invoice.letter} N° {formatInvoiceNumber(sale.invoice)}</p>
        )}
        <p className="text-black/60">Venta interna {sale.id}</p>
      </div>

      <table className="my-3 w-full border-y border-black">
        <thead>
          <tr className="text-left">
            <th className="py-1 font-bold">Cant.</th>
            <th className="py-1 font-bold">Descripción</th>
            <th className="py-1 text-right font-bold">Importe</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((i, idx) => (
            <tr key={idx} className="align-top">
              <td className="py-0.5 pr-2">{i.qty}</td>
              <td className="py-0.5 pr-2">
                {i.name}
                {i.qty > 1 && <span className="block text-black/60">{formatMoney(i.price)} c/u</span>}
              </td>
              <td className="py-0.5 text-right">{formatMoney(i.qty * i.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-0.5">
        {inv.letter === "A" && iva && (
          <>
            <div className={row}><span>Neto gravado</span><span>{formatMoney(iva.net)}</span></div>
            <div className={row}><span>IVA 21%</span><span>{formatMoney(iva.iva)}</span></div>
          </>
        )}
        <div className={`${row} pt-1 font-sans text-lg font-extrabold`}>
          <span>TOTAL</span>
          <span>{formatMoney(sale.total)}</span>
        </div>
        {inv.letter === "B" && iva && (
          <p className="pt-1 text-[10px]">
            Régimen de Transparencia Fiscal al Consumidor (Ley 27.743) · IVA contenido: {formatMoney(iva.iva)}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-black pt-3">
        <QrCode text={qrUrl(fiscal, inv, kind, sale.total)} size={96} />
        <div className="min-w-0 space-y-0.5">
          <p className="font-bold">Comprobante autorizado</p>
          <p>CAE N° {inv.cae}</p>
          <p>Vto. CAE: {caeDueOf(inv).toLocaleDateString("es-AR")}</p>
          <p className="text-[10px] text-black/60">CAE y QR de ejemplo: no se enviaron a ARCA.</p>
        </div>
      </div>
    </div>
  );
}
