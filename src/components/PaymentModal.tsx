import { useState } from "react";
import type { FormEvent } from "react";
import { FileText } from "lucide-react";
import { useStore } from "../store/useStore";
import Modal from "./Modal";
import { PAY_METHODS } from "../lib/payments";
import { formatMoney } from "../lib/format";
import { CONSUMIDOR_FINAL, cuitIsValid, letterFor, onlyDigits } from "../lib/invoice";
import type { InvoiceTarget, PayMethod } from "../types";

interface Props {
  total: number;
  onConfirm: (method: PayMethod, opts: { customerId?: string; received?: number; target: InvoiceTarget }) => void;
  onClose: () => void;
}

const BILLS = [1000, 2000, 5000, 10000, 20000, 50000];

// A quién se le factura. "A" solo existe para Responsable Inscripto.
type Receiver = "cf" | "doc" | "A";
const RECEIVERS: { id: Receiver; label: string }[] = [
  { id: "cf", label: "Consumidor final" },
  { id: "doc", label: "Con DNI o CUIT" },
  { id: "A", label: "Empresa (Factura A)" },
];

export default function PaymentModal({ total, onConfirm, onClose }: Props) {
  const customers = useStore((s) => s.customers);
  const fiscal = useStore((s) => s.fiscal);
  const [method, setMethod] = useState<PayMethod>("efectivo");
  const [received, setReceived] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [receiver, setReceiver] = useState<Receiver>("cf");
  const [doc, setDoc] = useState("");
  const [docName, setDocName] = useState("");

  const receivedNum = Number(received);
  const change = method === "efectivo" && receivedNum > 0 ? receivedNum - total : 0;
  const quick = BILLS.filter((b) => b >= total).slice(0, 3);

  const digits = onlyDigits(doc);
  const target: InvoiceTarget =
    receiver === "cf"
      ? CONSUMIDOR_FINAL
      : { letter: receiver === "A" ? "A" : undefined, docType: digits.length === 11 ? 80 : 96, docNumber: digits, customerName: docName };
  const letter = letterFor(fiscal, target);
  // Un CUIT tiene 11 dígitos y dígito verificador; un DNI, 7 u 8 dígitos. La Factura A pide CUIT y razón social.
  const docError = (() => {
    if (receiver === "cf") return "";
    if (digits === "") return receiver === "A" ? "Ingresá el CUIT de la empresa." : "Ingresá el DNI o CUIT.";
    if (digits.length === 11) {
      if (!cuitIsValid(digits)) return "El CUIT no es válido.";
      return receiver === "A" && !docName.trim() ? "Falta la razón social." : "";
    }
    if (receiver === "A") return "La Factura A necesita un CUIT de 11 dígitos.";
    return digits.length === 7 || digits.length === 8 ? "" : "El DNI tiene 7 u 8 dígitos.";
  })();
  const invoiceOk = !fiscal.autoInvoice || docError === "";

  const canConfirm =
    invoiceOk &&
    (method === "efectivo" ? received === "" || receivedNum >= total : method === "fiado" ? !!customerId : true);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canConfirm) return;
    onConfirm(method, {
      customerId: method === "fiado" ? customerId : undefined,
      received: method === "efectivo" && receivedNum > 0 ? receivedNum : undefined,
      target,
    });
  };

  return (
    <Modal title="Cobrar venta" subtitle="Elegí cómo paga el cliente." onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#0d2a55] to-blue-700 p-6 text-center text-white">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-400/30 blur-2xl" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">Total a cobrar</p>
          <p className="mt-1 text-5xl font-extrabold tracking-tight">{formatMoney(total)}</p>
        </div>

        <div>
          <span className="field-label">Medio de pago</span>
          <div className="grid grid-cols-3 gap-2">
            {PAY_METHODS.map(({ id, label, icon: Icon }) => (
              <button
                type="button"
                key={id}
                onClick={() => setMethod(id)}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-2 py-3.5 text-xs font-semibold transition active:scale-[0.97] ${
                  method === id
                    ? "border-blue-500 bg-blue-50 text-blue-800 shadow-[0_8px_20px_-10px_rgb(37_99_235/0.7)]"
                    : "border-transparent bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className={`icon-tile h-10 w-10 ${method === id ? "bg-gradient-to-br from-blue-600 to-sky-400 text-white" : "bg-white text-slate-500 shadow-sm"}`}>
                  <Icon size={20} />
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {method === "efectivo" && (
          <div className="space-y-3">
            <label className="block">
              <span className="field-label">Con cuánto paga el cliente</span>
              <input
                autoFocus
                type="number"
                min={0}
                value={received}
                onChange={(e) => setReceived(e.target.value)}
                placeholder={`Pago exacto (${formatMoney(total)})`}
                className="input py-3 text-xl font-semibold"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setReceived(String(total))} className="btn btn-ghost btn-sm">Exacto</button>
              {quick.map((b) => (
                <button type="button" key={b} onClick={() => setReceived(String(b))} className="btn btn-ghost btn-sm">
                  {formatMoney(b)}
                </button>
              ))}
            </div>
            {received !== "" && receivedNum < total && (
              <p className="chip chip-bad">Falta {formatMoney(total - receivedNum)}</p>
            )}
            {change > 0 && (
              <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-teal-50 to-sky-50 px-5 py-4 ring-1 ring-teal-200">
                <span className="text-sm font-semibold uppercase tracking-wide text-teal-800">Vuelto a entregar</span>
                <span className="text-3xl font-extrabold text-teal-700">{formatMoney(change)}</span>
              </div>
            )}
          </div>
        )}

        {method === "fiado" && (
          <label className="block">
            <span className="field-label">Cliente que se lleva fiado</span>
            <select autoFocus value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input">
              <option value="">Elegir cliente...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — debe {formatMoney(c.balance)}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-xs text-slate-500">
              El monto se suma a su cuenta corriente. Los clientes nuevos se crean en "Clientes y Fiado".
            </span>
          </label>
        )}

        {fiscal.autoInvoice ? (
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="field-label mb-0">Comprobante</span>
              <span className="chip chip-info"><FileText size={13} /> Factura {letter}</span>
            </div>
            <div className="flex rounded-full bg-slate-100 p-1 text-xs font-semibold">
              {RECEIVERS.filter((r) => r.id !== "A" || fiscal.condition === "ri").map((r) => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => setReceiver(r.id)}
                  className={`flex-1 rounded-full px-3 py-1.5 transition ${receiver === r.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {receiver !== "cf" && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <input
                  autoFocus
                  value={doc}
                  onChange={(e) => setDoc(e.target.value)}
                  inputMode="numeric"
                  placeholder={receiver === "A" ? "CUIT de la empresa" : "DNI o CUIT"}
                  aria-label={receiver === "A" ? "CUIT de la empresa" : "DNI o CUIT"}
                  className="input"
                />
                <input
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder={receiver === "A" ? "Razón social" : "Nombre (opcional)"}
                  aria-label={receiver === "A" ? "Razón social" : "Nombre"}
                  className="input"
                />
                {doc !== "" && docError && <p className="col-span-2 text-xs font-semibold text-red-600">{docError}</p>}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500">La facturación automática está apagada: la venta se puede facturar después desde Ventas.</p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
          <button disabled={!canConfirm} className="btn btn-primary px-7">Confirmar cobro</button>
        </div>
      </form>
    </Modal>
  );
}
