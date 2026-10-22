import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowDownLeft, ArrowUpRight, HandCoins, Plus, Search, UserPlus, Users } from "lucide-react";
import { useStore } from "../store/useStore";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import { COLLECT_METHODS, PAY_LABEL } from "../lib/payments";
import { formatDateTime, formatMoney } from "../lib/format";
import type { Customer, PayMethod } from "../types";

function NewCustomerForm({ onClose, onDone }: { onClose: () => void; onDone: (name: string) => void }) {
  const addCustomer = useStore((s) => s.addCustomer);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addCustomer(name.trim(), phone.trim());
    onDone(name.trim());
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="field-label">Nombre</span>
        <input autoFocus required value={name} onChange={(e) => setName(e.target.value)} className="input" />
      </label>
      <label className="block">
        <span className="field-label">Teléfono (opcional)</span>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
      </label>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
        <button className="btn btn-primary">Crear cliente</button>
      </div>
    </form>
  );
}

function PaymentForm({ customer, onClose, onDone }: { customer: Customer; onClose: () => void; onDone: (amount: number) => void }) {
  const registerPayment = useStore((s) => s.registerPayment);
  const [amount, setAmount] = useState(String(customer.balance));
  const [method, setMethod] = useState<PayMethod>("efectivo");
  const value = Number(amount);
  const valid = value > 0 && value <= customer.balance;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    if (registerPayment(customer.id, value, method)) onDone(value);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-[#0d2a55] to-blue-700 p-6 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">{customer.name} debe</p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight">{formatMoney(customer.balance)}</p>
      </div>
      <label className="block">
        <span className="field-label">Monto que paga ($)</span>
        <input autoFocus type="number" min={1} max={customer.balance} value={amount} onChange={(e) => setAmount(e.target.value)} className="input py-3 text-2xl font-bold" />
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={() => setAmount(String(customer.balance))} className="btn btn-ghost btn-sm">Saldar todo</button>
        <button type="button" onClick={() => setAmount(String(Math.round(customer.balance / 2)))} className="btn btn-ghost btn-sm">La mitad</button>
      </div>
      <label className="block">
        <span className="field-label">Medio de pago</span>
        <select value={method} onChange={(e) => setMethod(e.target.value as PayMethod)} className="input">
          {COLLECT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </label>
      {value > customer.balance && <p className="chip chip-bad">El monto supera la deuda.</p>}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
        <button disabled={!valid} className="btn btn-primary">Registrar pago</button>
      </div>
    </form>
  );
}

const initials = (name: string) =>
  name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export default function Customers() {
  const customers = useStore((s) => s.customers);
  const movements = useStore((s) => s.customerMovements);
  const cashOpen = useStore((s) => !!s.cash.current);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<"new" | "pay" | null>(null);
  const [toast, setToast] = useState<{ title: string; detail?: string } | null>(null);

  const q = query.trim().toLowerCase();
  const rows = customers
    .filter((c) => !q || c.name.toLowerCase().includes(q))
    .sort((a, b) => b.balance - a.balance);
  const selected = customers.find((c) => c.id === selectedId) ?? null;
  const totalDebt = customers.reduce((s, c) => s + c.balance, 0);
  const debtors = customers.filter((c) => c.balance > 0).length;
  const history = selected
    ? movements.filter((m) => m.customerId === selected.id).sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const close = () => setModal(null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card flex items-center gap-4 p-5">
          <span className="icon-tile h-14 w-14 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg"><HandCoins size={26} /></span>
          <div>
            <p className="kpi-label">Total a cobrar</p>
            <p className="text-3xl font-extrabold tracking-tight text-slate-900">{formatMoney(totalDebt)}</p>
            <p className="text-xs text-slate-500">Deuda total de tus clientes</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-5">
          <span className="icon-tile h-14 w-14 bg-gradient-to-br from-blue-500 to-sky-400 text-white shadow-lg"><Users size={26} /></span>
          <div>
            <p className="kpi-label">Clientes con deuda</p>
            <p className="text-3xl font-extrabold tracking-tight text-slate-900">{debtors}</p>
            <p className="text-xs text-slate-500">de {customers.length} clientes</p>
          </div>
        </div>
        <div className="flex items-center justify-end">
          <button onClick={() => setModal("new")} className="btn btn-primary">
            <UserPlus size={18} /> Nuevo cliente
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <section className="card overflow-hidden xl:col-span-3">
          <div className="p-4">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar cliente..." className="input rounded-full pl-11" />
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="border-y border-slate-100 bg-slate-50/70">
              <tr>
                <th className="th">Cliente</th>
                <th className="th">Teléfono</th>
                <th className="th text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`cursor-pointer transition hover:bg-blue-50/50 ${c.id === selectedId ? "bg-blue-50/70" : ""}`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="icon-tile h-10 w-10 bg-gradient-to-br from-slate-700 to-blue-700 text-xs font-bold text-white">{initials(c.name)}</span>
                      <span className="font-semibold text-slate-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{c.phone || "—"}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`chip ${c.balance > 0 ? "chip-warn" : "chip-ok"}`}>
                      {c.balance > 0 ? `Debe ${formatMoney(c.balance)}` : "Al día"}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={3} className="py-10 text-center text-slate-500">Sin clientes.</td></tr>}
            </tbody>
          </table>
        </section>

        <section className="card p-6 xl:col-span-2">
          {!selected ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <span className="icon-tile h-16 w-16 bg-slate-100 text-slate-400"><Users size={28} /></span>
              <p className="text-sm font-semibold text-slate-600">Elegí un cliente</p>
              <p className="max-w-52 text-xs text-slate-400">Vas a ver su cuenta corriente y podés registrar sus pagos.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="icon-tile h-12 w-12 bg-gradient-to-br from-slate-700 to-blue-700 font-bold text-white">{initials(selected.name)}</span>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">{selected.name}</h2>
                  <p className="text-sm text-slate-500">{selected.phone || "Sin teléfono"}</p>
                </div>
              </div>
              <div className={`mt-4 rounded-2xl p-5 ${selected.balance > 0 ? "bg-gradient-to-br from-amber-50 to-orange-50" : "bg-gradient-to-br from-teal-50 to-sky-50"}`}>
                <p className="kpi-label">Saldo actual</p>
                <p className={`text-4xl font-extrabold tracking-tight ${selected.balance > 0 ? "text-amber-600" : "text-teal-600"}`}>{formatMoney(selected.balance)}</p>
                <p className="text-xs text-slate-500">{selected.balance > 0 ? "Esto es lo que te debe" : "Está al día"}</p>
              </div>
              <button onClick={() => setModal("pay")} disabled={selected.balance === 0 || !cashOpen} className="btn btn-primary mt-4 w-full">
                <Plus size={18} /> Registrar pago
              </button>
              {!cashOpen && <p className="mt-2 text-center text-xs font-semibold text-amber-600">Abrí la caja para registrar cobros.</p>}
              <h3 className="kpi-label mb-2 mt-6">Movimientos de la cuenta</h3>
              <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                {history.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="flex items-center gap-3">
                      <span className={`icon-tile h-8 w-8 ${m.type === "compra" ? "bg-amber-50 text-amber-600" : "bg-teal-50 text-teal-600"}`}>
                        {m.type === "compra" ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                      </span>
                      <span>
                        <p className="text-sm font-semibold text-slate-800">
                          {m.type === "compra" ? "Compra a cuenta" : m.type === "anulacion" ? "Venta anulada" : `Pago · ${m.method ? PAY_LABEL[m.method] : ""}`}
                        </p>
                        <p className="text-xs text-slate-500">{formatDateTime(m.date)}</p>
                      </span>
                    </span>
                    <span className={`text-sm font-bold ${m.type === "compra" ? "text-amber-600" : "text-teal-600"}`}>
                      {m.type === "compra" ? "+" : "−"} {formatMoney(m.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      {modal === "new" && (
        <Modal title="Nuevo cliente" onClose={close}>
          <NewCustomerForm onClose={close} onDone={(name) => { close(); setToast({ title: "Cliente creado", detail: name }); }} />
        </Modal>
      )}
      {modal === "pay" && selected && (
        <Modal title="Registrar pago" subtitle="El pago reduce la deuda del cliente." onClose={close}>
          <PaymentForm customer={selected} onClose={close} onDone={(amount) => { close(); setToast({ title: "Pago registrado", detail: `${selected.name} · ${formatMoney(amount)}` }); }} />
        </Modal>
      )}
      {toast && <Toast title={toast.title} detail={toast.detail} onDone={() => setToast(null)} />}
    </div>
  );
}
