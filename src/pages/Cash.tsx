import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ArrowDownCircle, ArrowUpCircle, Banknote, HandCoins, Lock, LockOpen, Receipt, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStore } from "../store/useStore";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import { COLLECT_METHODS } from "../lib/payments";
import { summarizeSession } from "../lib/cash";
import { formatDateTime, formatMoney, formatTime } from "../lib/format";

function MovementForm({ type, onClose, onDone }: { type: "ingreso" | "egreso"; onClose: () => void; onDone: () => void }) {
  const addCashMovement = useStore((s) => s.addCashMovement);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!(Number(amount) > 0)) return;
    addCashMovement(type, Number(amount), note.trim() || (type === "ingreso" ? "Ingreso" : "Egreso"));
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="field-label">Monto ($)</span>
        <input autoFocus type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className="input py-3 text-2xl font-bold" />
      </label>
      <label className="block">
        <span className="field-label">Motivo</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={type === "egreso" ? "Ej: pago a proveedor de bebidas" : "Ej: cambio sencillo"}
          className="input"
        />
      </label>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
        <button disabled={!(Number(amount) > 0)} className="btn btn-primary">Registrar {type}</button>
      </div>
    </form>
  );
}

function Stat({ label, value, hint, icon: Icon, tile }: { label: string; value: string; hint: string; icon: LucideIcon; tile: string }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className={`icon-tile h-14 w-14 bg-gradient-to-br text-white shadow-lg ${tile}`}><Icon size={26} /></span>
      <div className="min-w-0">
        <p className="kpi-label">{label}</p>
        <p className="text-2xl font-extrabold tracking-tight text-slate-900">{value}</p>
        <p className="text-xs leading-tight text-slate-500">{hint}</p>
      </div>
    </div>
  );
}

export default function Cash() {
  const cash = useStore((s) => s.cash);
  const sales = useStore((s) => s.sales);
  const customerMovements = useStore((s) => s.customerMovements);
  const { openCash, closeCash } = useStore.getState();

  const [modal, setModal] = useState<"ingreso" | "egreso" | "close" | null>(null);
  const [opening, setOpening] = useState("15000");
  const [counted, setCounted] = useState("");
  const [toast, setToast] = useState<{ title: string; detail?: string } | null>(null);

  const session = cash.current;
  const sum = useMemo(
    () => (session ? summarizeSession(session, sales, customerMovements) : null),
    [session, sales, customerMovements],
  );
  const close = () => setModal(null);

  const onOpen = (e: FormEvent) => {
    e.preventDefault();
    openCash(Number(opening) || 0);
    setToast({ title: "Caja abierta", detail: `Monto inicial ${formatMoney(Number(opening) || 0)}` });
  };

  const onCloseCash = (e: FormEvent) => {
    e.preventDefault();
    if (!sum || counted === "") return;
    const diff = Number(counted) - sum.expected;
    closeCash(Number(counted));
    close();
    setCounted("");
    setToast({
      title: "Caja cerrada",
      detail: diff === 0 ? "La caja cerró justa." : `Diferencia: ${formatMoney(diff)}`,
    });
  };

  const history = (
    <section className="card overflow-hidden">
      <div className="px-6 pb-3 pt-5">
        <h2 className="section-title">Cierres anteriores</h2>
        <p className="section-sub">Cómo cerró cada turno: lo esperado contra lo que se contó.</p>
      </div>
      <table className="w-full text-sm">
        <thead className="border-y border-slate-100 bg-slate-50/70">
          <tr>
            {["Turno", "Apertura", "Cierre", "Cobrado", "Efectivo esperado", "Efectivo contado", "Resultado"].map((h) => (
              <th key={h} className="th">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {cash.history.map((h) => {
            const diff = h.counted - h.expected;
            return (
              <tr key={h.id} className="hover:bg-blue-50/40">
                <td className="px-5 py-3 font-semibold text-slate-800">{h.id}</td>
                <td className="px-5 py-3 text-slate-500">{formatDateTime(h.openedAt)}</td>
                <td className="px-5 py-3 text-slate-500">{formatDateTime(h.closedAt)}</td>
                <td className="px-5 py-3 font-semibold">{formatMoney(h.collected)}</td>
                <td className="px-5 py-3">{formatMoney(h.expected)}</td>
                <td className="px-5 py-3">{formatMoney(h.counted)}</td>
                <td className="px-5 py-3">
                  <span className={`chip ${diff === 0 ? "chip-ok" : diff < 0 ? "chip-bad" : "chip-warn"}`}>
                    {diff === 0 ? "Cerró justa" : diff < 0 ? `Faltó ${formatMoney(-diff)}` : `Sobró ${formatMoney(diff)}`}
                  </span>
                </td>
              </tr>
            );
          })}
          {cash.history.length === 0 && (
            <tr><td colSpan={7} className="py-10 text-center text-slate-500">Todavía no hay cierres.</td></tr>
          )}
        </tbody>
      </table>
    </section>
  );

  if (!session || !sum) {
    return (
      <div className="space-y-6">
        <section className="card mx-auto max-w-md p-8 text-center">
          <span className="icon-tile mx-auto mb-4 h-16 w-16 bg-gradient-to-br from-slate-500 to-slate-700 text-white shadow-lg">
            <Lock size={28} />
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">La caja está cerrada</h2>
          <p className="section-sub mb-6">Indicá con cuánto efectivo arrancás el turno para poder cobrar.</p>
          <form onSubmit={onOpen} className="space-y-4 text-left">
            <label className="block">
              <span className="field-label">Monto inicial en efectivo ($)</span>
              <input type="number" min={0} value={opening} onChange={(e) => setOpening(e.target.value)} className="input py-3 text-2xl font-bold" />
            </label>
            <button className="btn btn-primary w-full py-3.5 text-base">
              <LockOpen size={18} /> Abrir caja
            </button>
          </form>
        </section>
        {history}
        {toast && <Toast title={toast.title} detail={toast.detail} onDone={() => setToast(null)} />}
      </div>
    );
  }

  const diff = counted === "" ? 0 : Number(counted) - sum.expected;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="chip chip-ok px-4 py-1.5 text-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-teal-500" /> Caja abierta
          </span>
          <span className="text-sm text-slate-500">
            Turno {session.id} · desde las {formatTime(session.openedAt)} · {sum.salesCount} ventas
          </span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setModal("ingreso")} className="btn btn-ghost">
            <ArrowUpCircle size={18} className="text-teal-600" /> Registrar ingreso
          </button>
          <button onClick={() => setModal("egreso")} className="btn btn-ghost">
            <ArrowDownCircle size={18} className="text-red-500" /> Registrar egreso
          </button>
          <button onClick={() => setModal("close")} className="btn btn-dark">
            <Lock size={16} /> Cerrar caja
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat label="Monto inicial" value={formatMoney(session.opening)} hint="Con lo que abriste" icon={Wallet} tile="from-blue-500 to-indigo-600" />
        <Stat label="Total cobrado" value={formatMoney(sum.collected)} hint="Todos los medios de pago" icon={Receipt} tile="from-sky-400 to-blue-600" />
        <Stat label="Efectivo en caja" value={formatMoney(sum.expected)} hint="Lo que debería haber en el cajón" icon={Banknote} tile="from-teal-400 to-teal-600" />
        <Stat label="Fiado del turno" value={formatMoney(sum.byMethod.fiado)} hint="Vendido a cuenta, no cobrado" icon={HandCoins} tile="from-amber-400 to-orange-500" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="card p-6">
          <h2 className="section-title">Cobros por medio de pago</h2>
          <p className="section-sub mb-3">Lo que entró en este turno.</p>
          <ul className="divide-y divide-slate-100">
            {COLLECT_METHODS.map(({ id, label, icon: Icon }) => (
              <li key={id} className="flex items-center justify-between py-3">
                <span className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <span className="icon-tile h-9 w-9 bg-slate-100 text-slate-500"><Icon size={18} /></span> {label}
                </span>
                <span className="text-base font-bold text-slate-900">{formatMoney(sum.byMethod[id])}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-slate-400">Incluye {formatMoney(sum.debtPayments)} de cobros de deudas (fiado).</p>

          <div className="mt-4 space-y-2 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/60 p-5 text-sm">
            <p className="kpi-label mb-1">Cómo se calcula el efectivo en caja</p>
            <div className="flex justify-between"><span className="text-slate-500">Monto inicial</span><span>{formatMoney(session.opening)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">+ Efectivo cobrado</span><span>{formatMoney(sum.byMethod.efectivo)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">+ Ingresos</span><span>{formatMoney(sum.ingresos)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">− Egresos</span><span>{formatMoney(sum.egresos)}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900"><span>Efectivo en caja</span><span>{formatMoney(sum.expected)}</span></div>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="section-title">Ingresos y egresos manuales</h2>
          <p className="section-sub mb-3">Movimientos de plata que no son ventas.</p>
          {session.movements.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Todavía no registraste movimientos en este turno.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {[...session.movements].reverse().map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="flex items-center gap-3">
                    <span className={`icon-tile h-9 w-9 ${m.type === "ingreso" ? "bg-teal-50 text-teal-600" : "bg-red-50 text-red-500"}`}>
                      {m.type === "ingreso" ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                    </span>
                    <span>
                      <p className="text-sm font-semibold text-slate-800">{m.note}</p>
                      <p className="text-xs text-slate-500">{formatTime(m.date)}</p>
                    </span>
                  </span>
                  <span className={`text-base font-bold ${m.type === "ingreso" ? "text-teal-600" : "text-red-500"}`}>
                    {m.type === "ingreso" ? "+" : "−"} {formatMoney(m.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {history}

      {(modal === "ingreso" || modal === "egreso") && (
        <Modal
          title={modal === "ingreso" ? "Registrar ingreso" : "Registrar egreso"}
          subtitle={modal === "ingreso" ? "Plata que ponés en la caja (ej: cambio)." : "Plata que sacás de la caja (ej: pago a un proveedor)."}
          onClose={close}
        >
          <MovementForm
            type={modal}
            onClose={close}
            onDone={() => {
              close();
              setToast({ title: modal === "ingreso" ? "Ingreso registrado" : "Egreso registrado" });
            }}
          />
        </Modal>
      )}

      {modal === "close" && (
        <Modal title="Cerrar caja" subtitle="Contá el efectivo del cajón y compará." onClose={close}>
          <form onSubmit={onCloseCash} className="space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-[#0d2a55] to-blue-700 p-6 text-center text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">Efectivo que debería haber</p>
              <p className="mt-1 text-4xl font-extrabold tracking-tight">{formatMoney(sum.expected)}</p>
            </div>
            <label className="block">
              <span className="field-label">Efectivo que contaste ($)</span>
              <input autoFocus type="number" min={0} required value={counted} onChange={(e) => setCounted(e.target.value)} className="input py-3 text-2xl font-bold" />
            </label>
            {counted !== "" && (
              <p className={`rounded-2xl px-4 py-3 text-sm font-semibold ${diff === 0 ? "bg-teal-50 text-teal-700" : diff < 0 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
                {diff === 0 ? "La caja cierra justa." : diff < 0 ? `Faltan ${formatMoney(-diff)}` : `Sobran ${formatMoney(diff)}`}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={close} className="btn btn-ghost">Cancelar</button>
              <button disabled={counted === ""} className="btn btn-dark">Confirmar cierre</button>
            </div>
          </form>
        </Modal>
      )}

      {toast && <Toast title={toast.title} detail={toast.detail} onDone={() => setToast(null)} />}
    </div>
  );
}
