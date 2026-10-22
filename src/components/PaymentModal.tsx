import { useState } from "react";
import type { FormEvent } from "react";
import { useStore } from "../store/useStore";
import Modal from "./Modal";
import { PAY_METHODS } from "../lib/payments";
import { formatMoney } from "../lib/format";
import type { PayMethod } from "../types";

interface Props {
  total: number;
  onConfirm: (method: PayMethod, opts: { customerId?: string; received?: number }) => void;
  onClose: () => void;
}

const BILLS = [1000, 2000, 5000, 10000, 20000, 50000];

export default function PaymentModal({ total, onConfirm, onClose }: Props) {
  const customers = useStore((s) => s.customers);
  const [method, setMethod] = useState<PayMethod>("efectivo");
  const [received, setReceived] = useState("");
  const [customerId, setCustomerId] = useState("");

  const receivedNum = Number(received);
  const change = method === "efectivo" && receivedNum > 0 ? receivedNum - total : 0;
  const quick = BILLS.filter((b) => b >= total).slice(0, 3);

  const canConfirm =
    method === "efectivo" ? received === "" || receivedNum >= total : method === "fiado" ? !!customerId : true;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canConfirm) return;
    onConfirm(method, {
      customerId: method === "fiado" ? customerId : undefined,
      received: method === "efectivo" && receivedNum > 0 ? receivedNum : undefined,
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

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
          <button disabled={!canConfirm} className="btn btn-primary px-7">Confirmar cobro</button>
        </div>
      </form>
    </Modal>
  );
}
