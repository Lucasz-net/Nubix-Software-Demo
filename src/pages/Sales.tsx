import { useMemo, useState } from "react";
import { Ban, ChevronRight, Download, Receipt, Search, TrendingUp, Undo2, Wallet } from "lucide-react";
import { useStore } from "../store/useStore";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import { downloadCsv } from "../lib/csv";
import { formatDateTime, formatMoney, splitIva } from "../lib/format";
import { PAY_LABEL, PAY_METHODS } from "../lib/payments";
import { daysBack, saleProfit, startOfDay, totalsOf } from "../lib/sales";
import type { PayMethod, Sale } from "../types";

type Period = "today" | "yesterday" | "7" | "30" | "custom";
type Status = "all" | "ok" | "voided";

const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Hoy" },
  { id: "yesterday", label: "Ayer" },
  { id: "7", label: "7 días" },
  { id: "30", label: "30 días" },
  { id: "custom", label: "Fechas" },
];

const REASONS = ["Error al cargar el producto", "El cliente se arrepintió", "Producto en mal estado", "Otro motivo"];
const PAGE = 25;

const toInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

function rangeOf(period: Period, from: string, to: string): [number, number] {
  const end = startOfDay(new Date());
  end.setDate(end.getDate() + 1);
  switch (period) {
    case "today": return [daysBack(0).getTime(), end.getTime()];
    case "yesterday": return [daysBack(1).getTime(), daysBack(0).getTime()];
    case "7": return [daysBack(6).getTime(), end.getTime()];
    case "30": return [daysBack(29).getTime(), end.getTime()];
    default: {
      const a = from ? startOfDay(new Date(`${from}T00:00`)).getTime() : 0;
      const b = to ? startOfDay(new Date(`${to}T00:00`)).getTime() + 86400000 : Infinity;
      return [a, b];
    }
  }
}

function SaleDetail({ sale, customerName, onClose, onVoided }: {
  sale: Sale;
  customerName?: string;
  onClose: () => void;
  onVoided: (msg: string) => void;
}) {
  const voidSale = useStore((s) => s.voidSale);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [error, setError] = useState("");

  const { net, iva } = splitIva(sale.total);
  const profit = saleProfit(sale);
  const voided = !!sale.voidedAt;

  const confirmVoid = () => {
    const res = voidSale(sale.id, reason);
    if (res.ok) onVoided(`Venta ${sale.id} anulada · stock devuelto`);
    else setError(res.error);
  };

  return (
    <Modal title={`Venta ${sale.id}`} subtitle={formatDateTime(sale.date)} onClose={onClose}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip chip-info">{PAY_LABEL[sale.payment]}</span>
          {customerName && <span className="chip chip-warn">A cuenta de {customerName}</span>}
          {voided && <span className="chip chip-bad">Anulada</span>}
        </div>

        {voided && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            Anulada el {formatDateTime(sale.voidedAt!)}{sale.voidReason ? ` · ${sale.voidReason}` : ""}. No suma en las ventas, la caja ni las estadísticas.
          </p>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70">
              <tr>
                <th className="th">Producto</th>
                <th className="th text-right">Cant.</th>
                <th className="th text-right">Precio</th>
                <th className="th text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sale.items.map((i, idx) => (
                <tr key={idx}>
                  <td className="px-5 py-2.5 font-medium text-slate-800">{i.name}</td>
                  <td className="px-5 py-2.5 text-right text-slate-600">{i.qty}</td>
                  <td className="px-5 py-2.5 text-right text-slate-500">{formatMoney(i.price)}</td>
                  <td className="px-5 py-2.5 text-right font-bold text-slate-900">{formatMoney(i.price * i.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-1.5 rounded-2xl bg-gradient-to-r from-blue-50 to-teal-50 px-5 py-4 text-sm">
          <div className="flex justify-between text-slate-500"><span>Subtotal (neto)</span><span>{formatMoney(net)}</span></div>
          <div className="flex justify-between text-slate-500"><span>IVA 21% incluido</span><span>{formatMoney(iva)}</span></div>
          <div className="flex justify-between text-slate-500"><span>Ganancia estimada</span><span className="font-semibold text-teal-700">{formatMoney(profit)}</span></div>
          <div className="flex items-end justify-between pt-1">
            <span className="font-semibold uppercase tracking-wider text-slate-500">Total</span>
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">{formatMoney(sale.total)}</span>
          </div>
        </div>

        {!voided && !confirming && (
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn btn-ghost">Cerrar</button>
            <button onClick={() => setConfirming(true)} className="btn bg-red-50 text-red-600 hover:bg-red-100">
              <Undo2 size={16} /> Anular venta
            </button>
          </div>
        )}

        {!voided && confirming && (
          <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50/60 p-4">
            <p className="text-sm font-semibold text-red-700">¿Anular esta venta?</p>
            <p className="text-xs text-red-700/80">
              Se devuelve el stock{sale.payment === "fiado" ? ", se descuenta la deuda del cliente" : sale.payment === "efectivo" ? " y se registra la devolución del efectivo en la caja" : ""}. No se puede deshacer.
            </p>
            <label className="block">
              <span className="field-label">Motivo</span>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="input">
                {REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setConfirming(false); setError(""); }} className="btn btn-ghost">Volver</button>
              <button onClick={confirmVoid} className="btn bg-red-600 text-white hover:bg-red-700">
                <Ban size={16} /> Sí, anular
              </button>
            </div>
          </div>
        )}

        {voided && (
          <div className="flex justify-end">
            <button onClick={onClose} className="btn btn-ghost">Cerrar</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function Sales() {
  const sales = useStore((s) => s.sales);
  const customers = useStore((s) => s.customers);

  const [period, setPeriod] = useState<Period>("7");
  const [from, setFrom] = useState(toInput(daysBack(6)));
  const [to, setTo] = useState(toInput(new Date()));
  const [payment, setPayment] = useState<PayMethod | "all">("all");
  const [status, setStatus] = useState<Status>("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const customerName = (id?: string) => customers.find((c) => c.id === id)?.name;

  const rows = useMemo(() => {
    const [a, b] = rangeOf(period, from, to);
    const q = query.trim().toLowerCase();
    return sales
      .filter((s) => {
        const t = new Date(s.date).getTime();
        if (t < a || t >= b) return false;
        if (payment !== "all" && s.payment !== payment) return false;
        if (status === "ok" && s.voidedAt) return false;
        if (status === "voided" && !s.voidedAt) return false;
        return !q || s.id.toLowerCase().includes(q) || s.items.some((i) => i.name.toLowerCase().includes(q));
      })
      .reverse();
  }, [sales, period, from, to, payment, status, query]);

  const sum = totalsOf(rows);
  const open = sales.find((s) => s.id === openId) ?? null;
  const hasFilters = payment !== "all" || status !== "all" || query !== "";

  const reset = () => { setPayment("all"); setStatus("all"); setQuery(""); setShown(PAGE); };
  const pick = <T,>(set: (v: T) => void) => (v: T) => { set(v); setShown(PAGE); };

  const exportCsv = () => {
    downloadCsv(
      `ventas-nubix-${toInput(new Date())}.csv`,
      ["N° de venta", "Fecha", "Hora", "Medio de pago", "Cliente", "Productos", "Total", "Ganancia", "Estado"],
      rows.map((s) => {
        const d = new Date(s.date);
        return [
          s.id,
          d.toLocaleDateString("es-AR"),
          d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
          PAY_LABEL[s.payment],
          customerName(s.customerId) ?? "",
          s.items.map((i) => `${i.qty} x ${i.name}`).join(" | "),
          s.total,
          saleProfit(s),
          s.voidedAt ? "Anulada" : "Cobrada",
        ];
      }),
    );
    setToast(`${rows.length} ventas exportadas a CSV`);
  };

  const kpis = [
    { label: "Total vendido", value: formatMoney(sum.total), hint: "del período elegido", icon: Wallet, tile: "from-blue-600 to-sky-400" },
    { label: "Ventas", value: String(sum.count), hint: sum.voided ? `${sum.voided} anulada${sum.voided === 1 ? "" : "s"} no suman` : "operaciones realizadas", icon: Receipt, tile: "from-sky-400 to-teal-500" },
    { label: "Ganancia estimada", value: formatMoney(sum.profit), hint: sum.total ? `${Math.round((sum.profit / sum.total) * 100)}% de margen` : "sin ventas", icon: TrendingUp, tile: "from-teal-400 to-teal-600" },
    { label: "Ticket promedio", value: formatMoney(sum.avg), hint: "por venta", icon: Receipt, tile: "from-blue-500 to-indigo-600" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card flex items-center gap-4 p-5">
            <span className={`icon-tile h-12 w-12 bg-gradient-to-br text-white shadow-lg ${k.tile}`}><k.icon size={22} /></span>
            <div className="min-w-0">
              <p className="kpi-label">{k.label}</p>
              <p className="text-2xl font-extrabold tracking-tight text-slate-900">{k.value}</p>
              <p className="text-xs leading-tight text-slate-500">{k.hint}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-full bg-slate-100 p-1 text-xs font-semibold">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => pick(setPeriod)(p.id)}
                className={`rounded-full px-4 py-1.5 transition ${period === p.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <input type="date" value={from} max={to || undefined} onChange={(e) => pick(setFrom)(e.target.value)} className="input w-auto" aria-label="Desde" />
              <span>a</span>
              <input type="date" value={to} min={from || undefined} onChange={(e) => pick(setTo)(e.target.value)} className="input w-auto" aria-label="Hasta" />
            </div>
          )}
          <div className="relative ml-auto w-72">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => pick(setQuery)(e.target.value)}
              placeholder="Buscar N° de venta o producto..."
              className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
            />
          </div>
          <button onClick={exportCsv} disabled={rows.length === 0} className="btn btn-aqua">
            <Download size={16} /> Exportar CSV
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="kpi-label mr-1">Medio de pago</span>
            {([["all", "Todos"], ...PAY_METHODS.map((m) => [m.id, m.label])] as [PayMethod | "all", string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => pick(setPayment)(id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 ${payment === id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="kpi-label mr-1">Estado</span>
            {([["all", "Todas"], ["ok", "Cobradas"], ["voided", "Anuladas"]] as [Status, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => pick(setStatus)(id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 ${status === id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {hasFilters && (
            <button onClick={reset} className="text-xs font-semibold text-blue-600 hover:underline">Limpiar filtros</button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/70">
            <tr>
              <th className="th">Venta</th>
              <th className="th">Fecha y hora</th>
              <th className="th">Productos</th>
              <th className="th">Medio de pago</th>
              <th className="th text-right">Total</th>
              <th className="th text-right">Ganancia</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.slice(0, shown).map((s) => {
              const first = s.items[0];
              const name = customerName(s.customerId);
              return (
                <tr key={s.id} onClick={() => setOpenId(s.id)} className={`cursor-pointer transition hover:bg-blue-50/40 ${s.voidedAt ? "opacity-60" : ""}`}>
                  <td className="px-5 py-3 font-semibold text-slate-900">{s.id}</td>
                  <td className="px-5 py-3 text-slate-600">{formatDateTime(s.date)}</td>
                  <td className="px-5 py-3">
                    <p className="max-w-64 truncate font-medium text-slate-800">{first.qty > 1 ? `${first.qty} × ` : ""}{first.name}</p>
                    {s.items.length > 1 && <p className="text-xs text-slate-400">+ {s.items.length - 1} producto{s.items.length > 2 ? "s" : ""} más</p>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="chip chip-info">{PAY_LABEL[s.payment]}</span>
                      {name && <span className="text-xs text-slate-500">{name}</span>}
                      {s.voidedAt && <span className="chip chip-bad">Anulada</span>}
                    </div>
                  </td>
                  <td className={`px-5 py-3 text-right text-base font-bold text-slate-900 ${s.voidedAt ? "line-through" : ""}`}>{formatMoney(s.total)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-teal-700">{s.voidedAt ? "—" : formatMoney(saleProfit(s))}</td>
                  <td className="px-5 py-3 text-right text-slate-300"><ChevronRight size={18} /></td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="py-14 text-center text-slate-500">No hay ventas con estos filtros.</td></tr>
            )}
          </tbody>
        </table>
        {rows.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            <span>Mostrando {Math.min(shown, rows.length)} de {rows.length} ventas</span>
            {shown < rows.length && (
              <button onClick={() => setShown((n) => n + PAGE)} className="btn btn-soft btn-sm">Ver más ventas</button>
            )}
          </div>
        )}
      </div>

      {open && (
        <SaleDetail
          sale={open}
          customerName={customerName(open.customerId)}
          onClose={() => setOpenId(null)}
          onVoided={(msg) => { setOpenId(null); setToast(msg); }}
        />
      )}
      {toast && <Toast title={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
