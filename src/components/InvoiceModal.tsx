import { useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, Printer } from "lucide-react";
import { useStore } from "../store/useStore";
import Modal from "./Modal";
import InvoiceView from "./InvoiceView";
import { KIND_LABEL, formatInvoiceNumber, whatsappText } from "../lib/invoice";
import type { InvoiceKind } from "../lib/invoice";
import { openWhatsApp } from "../lib/whatsapp";

interface Props {
  saleId: string;
  kind: InvoiceKind;
  onClose: () => void;
}

export default function InvoiceModal({ saleId, kind, onClose }: Props) {
  const sale = useStore((s) => s.sales.find((x) => x.id === saleId));
  const fiscal = useStore((s) => s.fiscal);
  const customerPhone = useStore((s) => s.customers.find((c) => c.id === sale?.customerId)?.phone ?? "");
  const [phone, setPhone] = useState(customerPhone);

  const inv = kind === "factura" ? sale?.invoice : sale?.creditNote;
  if (!sale || !inv) return null;

  return (
    <Modal title={`${KIND_LABEL[kind]} ${inv.letter}`} subtitle={`N° ${formatInvoiceNumber(inv)} · venta ${sale.id}`} onClose={onClose}>
      <div className="space-y-5">
        <div className="rounded-3xl bg-slate-100 p-3">
          <div className="shadow-card">
            <InvoiceView sale={sale} kind={kind} fiscal={fiscal} />
          </div>
        </div>

        <label className="block">
          <span className="field-label">WhatsApp del cliente (opcional)</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 3511234567 · sin número, elegís el contacto" className="input" />
        </label>
        <div className="flex justify-end gap-3">
          <button onClick={() => openWhatsApp(phone, whatsappText(fiscal, inv, kind, sale.total))} className="btn btn-aqua">
            <MessageCircle size={16} /> Enviar por WhatsApp
          </button>
          <button onClick={() => window.print()} className="btn btn-primary">
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>

      {/* Copia para la impresora: al imprimir se oculta toda la app y queda solo el comprobante. */}
      {createPortal(
        <div className="print-root">
          <InvoiceView sale={sale} kind={kind} fiscal={fiscal} />
        </div>,
        document.body,
      )}
    </Modal>
  );
}
