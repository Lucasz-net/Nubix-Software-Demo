import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, ChevronRight, FileMinus, FileText, Gauge, Info, Landmark, Search, Settings2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStore } from "../store/useStore";
import Modal from "../components/Modal";
import NumberInput from "../components/NumberInput";
import Toast from "../components/Toast";
import InvoiceModal from "../components/InvoiceModal";
import { formatDateTime, formatMoney, splitIva } from "../lib/format";
import {
  CONDITION_LABEL,
  MONOTRIBUTO_LIMITS,
  cuitIsValid,
  formatCuit,
  formatInvoiceNumber,
  onlyDigits,
  receiverLabel,
} from "../lib/invoice";
import type { InvoiceKind } from "../lib/invoice";
import type { FiscalSettings, Invoice, Sale } from "../types";

type Period = "month" | "prev" | "all";
type KindFilter = "all" | InvoiceKind;

const PERIODS: { id: Period; label: string }[] = [
  { id: "month", label: "Este mes" },
  { id: "prev", label: "Mes anterior" },
  { id: "all", label: "Todos" },
];

const PAGE = 25;
const DAY = 86400000;

interface Row {
  sale: Sale;
  inv: Invoice;
  kind: InvoiceKind;
  amount: number; // negativo en las notas de crédito
  time: number;
}

function FiscalForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const updateFiscal = useStore((s) => s.updateFiscal);
  const [form, setForm] = useState<FiscalSettings>(useStore.getState().fiscal);
  const set = <K extends keyof FiscalSettings>(key: K, value: FiscalSettings[K]) => setForm((f) => ({ ...f, [key]: value }));
  const cuitOk = cuitIsValid(form.cuit);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!cuitOk) return;
    updateFiscal({ ...form, cuit: onlyDigits(form.cuit), businessName: form.businessName.trim(), address: form.address.trim() });
    onDone();
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-4">
      <label className="col-span-2">
        <span className="field-label">Nombre o razón social</span>
        <input required value={form.businessName} onChange={(e) => set("businessName", e.target.value)} className="input" />
      </label>
      <label>
        <span className="field-label">CUIT</span>
        <input
          required
          value={formatCuit(form.cuit)}
          onChange={(e) => set("cuit", onlyDigits(e.target.value).slice(0, 11))}
          className={`input ${cuitOk ? "" : "border-red-400"}`}
        />
        {!cuitOk && <span className="mt-1 block text-xs font-semibold text-red-600">CUIT inválido</span>}
      </label>
      <label>
        <span className="field-label">Inicio de actividades</span>
        <input required type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className="input" />
      </label>
      <label className="col-span-2">
        <span className="field-label">Domicilio comercial</span>
        <input required value={form.address} onChange={(e) => set("address", e.target.value)} className="input" />
      </label>

      <div className="col-span-2">
        <span className="field-label">Condición frente al IVA</span>
        <div className="grid grid-cols-2 gap-2 rounded-full bg-slate-100 p-1">
          {(["monotributo", "ri"] as const).map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => set("condition", c)}
              className={`rounded-full py-2 text-sm font-semibold transition ${form.condition === c ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {CONDITION_LABEL[c]}
            </button>
          ))}
        </div>
        <span className="mt-1.5 block text-xs text-slate-500">
          {form.condition === "monotributo" ? "Emite Factura C." : "Emite Factura B a consumidores finales y Factura A a otros Responsables Inscriptos."}
        </span>
      </div>

      {form.condition === "monotributo" && (
        <>
          <label>
            <span className="field-label">Categoría</span>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, annualLimit: MONOTRIBUTO_LIMITS[e.target.value] }))}
              className="input"
            >
              {Object.keys(MONOTRIBUTO_LIMITS).map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>
            <span className="field-label">Tope anual de la categoría ($)</span>
            <NumberInput required min={1} value={form.annualLimit} onChange={(v) => set("annualLimit", v)} className="input" />
          </label>
          <p className="col-span-2 -mt-2 text-xs text-slate-500">
            El tope se completa con un valor de referencia. ARCA lo actualiza dos veces por año: corregilo con el vigente.
          </p>
        </>
      )}

      <label>
        <span className="field-label">Punto de venta</span>
        <NumberInput required min={1} max={99999} value={form.pos} onChange={(v) => set("pos", v)} className="input" />
      </label>
      <label className="flex items-center gap-3 self-end rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-700">
        <input type="checkbox" checked={form.autoInvoice} onChange={(e) => set("autoInvoice", e.target.checked)} className="h-4 w-4 accent-blue-600" />
        Facturar cada venta al cobrar
      </label>

      <div className="col-span-2 mt-2 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
        <button disabled={!cuitOk} className="btn btn-primary">Guardar datos</button>
      </div>
    </form>
  );
}

function Kpi({ label, value, hint, icon: Icon, tile }: { label: string; value: string; hint: string; icon: LucideIcon; tile: string }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className={`icon-tile h-12 w-12 bg-gradient-to-br text-white shadow-lg ${tile}`}><Icon size={22} /></span>
      <div className="min-w-0">
        <p className="kpi-label">{label}</p>
        <p className="text-2xl font-extrabold tracking-tight text-slate-900">{value}</p>
        <p className="text-xs leading-tight text-slate-500">{hint}</p>
      </div>
    </div>
  );
}

export default function Invoices() {
  const sales = useStore((s) => s.sales);
  const fiscal = useStore((s) => s.fiscal);
  const [period, setPeriod] = useState<Period>("month");
  const [kind, setKind] = useState<KindFilter>("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [view, setView] = useState<{ saleId: string; kind: InvoiceKind } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Una fila por comprobante: la factura de cada venta y, si se anuló, su nota de crédito.
  const all = useMemo(() => {
    const rows: Row[] = [];
    for (const sale of sales) {
      if (sale.invoice) rows.push({ sale, inv: sale.invoice, kind: "factura", amount: sale.total, time: new Date(sale.invoice.date).getTime() });
      if (sale.creditNote) rows.push({ sale, inv: sale.creditNote, kind: "nc", amount: -sale.total, time: new Date(sale.creditNote.date).getTime() });
    }
    return rows.sort((a, b) => b.time - a.time);
  }, [sales]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

  const stats = useMemo(() => {
    const month = all.filter((r) => r.time >= monthStart);
    const net = (rows: Row[]) => rows.reduce((s, r) => s + r.amount, 0);
    const last30 = net(all.filter((r) => r.time >= Date.now() - 30 * DAY));
    return {
      monthTotal: net(month),
      monthInvoices: month.filter((r) => r.kind === "factura").length,
      monthCredit: month.filter((r) => r.kind === "nc"),
      // IVA débito fiscal del mes: solo lo discriminan la A y la B.
      monthIva: month.filter((r) => r.inv.letter !== "C").reduce((s, r) => s + Math.sign(r.amount) * splitIva(Math.abs(r.amount)).iva, 0),
      year: net(all.filter((r) => r.time >= Date.now() - 365 * DAY)),
      projection: last30 * 12,
    };
  }, [all, monthStart]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((r) => {
      if (period === "month" && r.time < monthStart) return false;
      if (period === "prev" && (r.time < prevStart || r.time >= monthStart)) return false;
      if (kind !== "all" && r.kind !== kind) return false;
      return !q || formatInvoiceNumber(r.inv).includes(q) || r.sale.id.toLowerCase().includes(q) || (r.inv.customerName ?? "").toLowerCase().includes(q);
    });
  }, [all, period, kind, query, monthStart, prevStart]);

  const isMono = fiscal.condition === "monotributo";
  const yearPct = Math.round((stats.year / fiscal.annualLimit) * 100);
  const projPct = Math.round((stats.projection / fiscal.annualLimit) * 100);
  const monthName = now.toLocaleDateString("es-AR", { month: "long" });
  const pick = <T,>(set: (v: T) => void) => (v: T) => { set(v); setShown(PAGE); };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm text-blue-800">
        <span className="flex items-center gap-2">
          <Info size={18} className="shrink-0" />
          <span>
            <b>Modo demostración:</b> los comprobantes tienen el formato real (CAE, QR, numeración), pero no se envían a ARCA y no tienen validez fiscal.
          </span>
        </span>
        <button onClick={() => setSettingsOpen(true)} className="btn btn-ghost btn-sm">
          <Settings2 size={14} /> Datos fiscales
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Kpi label={`Facturado en ${monthName}`} value={formatMoney(stats.monthTotal)} hint="Facturas menos notas de crédito" icon={FileText} tile="from-blue-600 to-sky-400" />
        <Kpi
          label="Comprobantes del mes"
          value={String(stats.monthInvoices)}
          hint={stats.monthCredit.length ? `facturas · ${stats.monthCredit.length} nota${stats.monthCredit.length === 1 ? "" : "s"} de crédito` : "facturas · sin notas de crédito"}
          icon={FileMinus}
          tile="from-sky-400 to-teal-500"
        />
        {isMono ? (
          <Kpi label="Tu categoría" value={`Monotributo ${fiscal.category}`} hint={`Tope anual ${formatMoney(fiscal.annualLimit)}`} icon={Landmark} tile="from-teal-400 to-teal-600" />
        ) : (
          <Kpi label="IVA débito del mes" value={formatMoney(stats.monthIva)} hint="IVA de las facturas A y B emitidas" icon={Landmark} tile="from-teal-400 to-teal-600" />
        )}
      </div>

      {isMono && (
        <section className="card p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="section-title flex items-center gap-2"><Gauge size={18} className="text-blue-600" /> Control del tope del monotributo</h2>
              <p className="section-sub">Cuánto facturaste en los últimos 12 meses y adónde llegás si seguís a este ritmo.</p>
            </div>
            {projPct >= 90 ? (
              <span className="chip chip-bad"><AlertTriangle size={13} /> Al ritmo actual superás el tope: revisá tu categoría</span>
            ) : projPct >= 75 ? (
              <span className="chip chip-warn"><AlertTriangle size={13} /> Te estás acercando al tope</span>
            ) : (
              <span className="chip chip-ok">Dentro de tu categoría</span>
            )}
          </div>
          <div className="relative h-4 overflow-hidden rounded-full bg-slate-100">
            <div className="absolute inset-y-0 left-0 rounded-full bg-sky-200" style={{ width: `${Math.min(projPct, 100)}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-600 to-sky-400" style={{ width: `${Math.min(yearPct, 100)}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Últimos 12 meses: <b>{formatMoney(stats.year)}</b> ({yearPct}%)</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-sky-200" /> Proyección anual: <b>{formatMoney(stats.projection)}</b> ({projPct}%)</span>
            <span className="text-slate-500">Tope categoría {fiscal.category}: {formatMoney(fiscal.annualLimit)}</span>
          </div>
        </section>
      )}

      <div className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-full bg-slate-100 p-1 text-xs font-semibold">
            {PERIODS.map((p) => (
              <button key={p.id} onClick={() => pick(setPeriod)(p.id)} className={`rounded-full px-4 py-1.5 transition ${period === p.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-full bg-slate-100 p-1 text-xs font-semibold">
            {([["all", "Todos"], ["factura", "Facturas"], ["nc", "Notas de crédito"]] as [KindFilter, string][]).map(([id, label]) => (
              <button key={id} onClick={() => pick(setKind)(id)} className={`rounded-full px-4 py-1.5 transition ${kind === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-72">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => pick(setQuery)(e.target.value)}
              placeholder="Buscar N° de comprobante, venta o cliente..."
              className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
            />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/70">
            <tr>
              <th className="th">Comprobante</th>
              <th className="th">Fecha</th>
              <th className="th">Cliente</th>
              <th className="th">Venta</th>
              <th className="th">CAE</th>
              <th className="th text-right">Importe</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.slice(0, shown).map((r) => (
              <tr key={`${r.kind}-${r.sale.id}`} onClick={() => setView({ saleId: r.sale.id, kind: r.kind })} className="cursor-pointer transition hover:bg-blue-50/40">
                <td className="whitespace-nowrap px-5 py-3">
                  <span className={`chip mr-2 ${r.kind === "nc" ? "chip-bad" : "chip-info"}`}>{r.kind === "nc" ? "NC" : "Factura"} {r.inv.letter}</span>
                  <span className="font-mono text-xs font-semibold text-slate-800">{formatInvoiceNumber(r.inv)}</span>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-slate-600">{formatDateTime(r.inv.date)}</td>
                <td className="px-5 py-3 text-slate-600">{r.inv.customerName ?? receiverLabel(r.inv)}</td>
                <td className="px-5 py-3 text-slate-500">{r.sale.id}</td>
                <td className="px-5 py-3 font-mono text-xs text-slate-500">{r.inv.cae}</td>
                <td className={`whitespace-nowrap px-5 py-3 text-right text-base font-bold ${r.amount < 0 ? "text-red-500" : "text-slate-900"}`}>
                  {r.amount < 0 ? "− " : ""}{formatMoney(Math.abs(r.amount))}
                </td>
                <td className="px-5 py-3 text-right text-slate-300"><ChevronRight size={18} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="py-14 text-center text-slate-500">No hay comprobantes con estos filtros.</td></tr>
            )}
          </tbody>
        </table>
        {rows.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            <span>Mostrando {Math.min(shown, rows.length)} de {rows.length} comprobantes</span>
            {shown < rows.length && (
              <button onClick={() => setShown((n) => n + PAGE)} className="btn btn-soft btn-sm">Ver más comprobantes</button>
            )}
          </div>
        )}
      </div>

      {view && <InvoiceModal saleId={view.saleId} kind={view.kind} onClose={() => setView(null)} />}
      {settingsOpen && (
        <Modal title="Datos fiscales" subtitle="Con estos datos se arman las facturas." onClose={() => setSettingsOpen(false)} wide>
          <FiscalForm onClose={() => setSettingsOpen(false)} onDone={() => { setSettingsOpen(false); setToast("Datos fiscales guardados"); }} />
        </Modal>
      )}
      {toast && <Toast title={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
