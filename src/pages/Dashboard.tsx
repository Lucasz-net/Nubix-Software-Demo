import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Boxes, HandCoins, Receipt, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStore } from "../store/useStore";
import { formatDateTime, formatMoney, sameDay } from "../lib/format";
import { PAY_LABEL } from "../lib/payments";
import { daysBack, isActive, saleProfit as profitOf } from "../lib/sales";

interface StatProps {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tile: string;
  onClick?: () => void;
  cta?: string;
}

function Stat({ label, value, hint, icon: Icon, tile, onClick, cta }: StatProps) {
  return (
    <div className="card flex flex-1 items-center gap-4 p-5">
      <span className={`icon-tile h-14 w-14 bg-gradient-to-br text-white shadow-lg ${tile}`}>
        <Icon size={26} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="kpi-label">{label}</p>
        <p className="text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
        <p className="text-xs leading-tight text-slate-500">{hint}</p>
      </div>
      {onClick && (
        <button onClick={onClick} className="btn btn-soft btn-sm shrink-0">
          {cta} <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

export default function Dashboard() {
  const allSales = useStore((s) => s.sales);
  const products = useStore((s) => s.products);
  const customers = useStore((s) => s.customers);
  const setScreen = useStore((s) => s.setScreen);
  const [metric, setMetric] = useState<"ventas" | "ganancia">("ventas");

  const data = useMemo(() => {
    const sales = allSales.filter(isActive);
    const weekStart = daysBack(6).getTime();
    const now = new Date();
    const todaySales = sales.filter((s) => sameDay(new Date(s.date), now));
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const day = sales.filter((s) => sameDay(new Date(s.date), d));
      return {
        label: d.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", ""),
        ventas: day.reduce((sum, s) => sum + s.total, 0),
        ganancia: day.reduce((sum, s) => sum + profitOf(s), 0),
      };
    });

    const qtyById = new Map<string, { name: string; qty: number }>();
    sales.filter((s) => new Date(s.date).getTime() >= weekStart).forEach((s) =>
      s.items.forEach((i) => {
        const cur = qtyById.get(i.productId) ?? { name: i.name, qty: 0 };
        cur.qty += i.qty;
        qtyById.set(i.productId, cur);
      }),
    );
    const top = [...qtyById.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);

    const todayTotal = todaySales.reduce((s, x) => s + x.total, 0);
    const todayProfit = todaySales.reduce((s, x) => s + profitOf(x), 0);

    return { todayTotal, todayProfit, todayCount: todaySales.length, week, top, recent: [...sales].reverse().slice(0, 5) };
  }, [allSales]);

  const stockValue = products.reduce((s, p) => s + p.cost * p.stock, 0);
  const lowStock = products.filter((p) => p.stock <= p.minStock);
  const debtors = customers.filter((c) => c.balance > 0).sort((a, b) => b.balance - a.balance);
  const totalDebt = debtors.reduce((s, c) => s + c.balance, 0);
  const maxWeek = Math.max(...data.week.map((w) => w[metric]), 1);
  const maxTop = Math.max(...data.top.map((t) => t.qty), 1);
  const marginPct = data.todayTotal > 0 ? Math.round((data.todayProfit / data.todayTotal) * 100) : 0;
  const avgTicket = data.todayCount > 0 ? Math.round(data.todayTotal / data.todayCount) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-[#0d2a55] to-blue-600 p-8 text-white shadow-float xl:col-span-3">
          <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-sky-400/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-teal-400/25 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">Ventas de hoy</p>
            <p className="mt-2 text-6xl font-extrabold tracking-tight">{formatMoney(data.todayTotal)}</p>
            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-200">Ganancia estimada</p>
                <p className="mt-1 text-2xl font-bold">{formatMoney(data.todayProfit)}</p>
                <p className="text-xs text-teal-300">{marginPct}% de margen</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-200">Operaciones</p>
                <p className="mt-1 text-2xl font-bold">{data.todayCount}</p>
                <p className="text-xs text-sky-200/80">ventas realizadas</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-200">Ticket promedio</p>
                <p className="mt-1 text-2xl font-bold">{formatMoney(avgTicket)}</p>
                <p className="text-xs text-sky-200/80">por venta</p>
              </div>
            </div>
            <button onClick={() => setScreen("pos")} className="btn mt-7 bg-white text-slate-900 hover:bg-sky-50">
              <Receipt size={16} /> Nueva venta
            </button>
          </div>
        </section>

        <div className="flex flex-col gap-6 xl:col-span-2">
          <Stat
            label="Valor del stock"
            value={formatMoney(stockValue)}
            hint={`${products.length} productos · a precio de costo`}
            icon={Boxes}
            tile="from-blue-500 to-indigo-600"
          />
          <Stat
            label="Alertas de faltantes"
            value={String(lowStock.length)}
            hint={lowStock.length ? "Por debajo del stock mínimo" : "Todo el stock está en orden"}
            icon={AlertTriangle}
            tile={lowStock.length ? "from-amber-400 to-orange-500" : "from-teal-400 to-teal-600"}
            onClick={lowStock.length ? () => setScreen("restock") : undefined}
            cta="Reponer"
          />
          <Stat
            label="Fiado pendiente"
            value={formatMoney(totalDebt)}
            hint={`${debtors.length} clientes con deuda`}
            icon={HandCoins}
            tile="from-sky-400 to-teal-500"
            onClick={() => setScreen("customers")}
            cta="Ver"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="card p-6 xl:col-span-2">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="section-title">Evolución de los últimos 7 días</h2>
              <p className="section-sub">{metric === "ventas" ? "Total vendido por día" : "Ganancia estimada por día"}</p>
            </div>
            <div className="flex rounded-full bg-slate-100 p-1 text-xs font-semibold">
              {(["ventas", "ganancia"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`rounded-full px-4 py-1.5 capitalize transition ${metric === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex h-64 items-end gap-3">
            {data.week.map((w, i) => {
              const today = i === 6;
              return (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className={`text-xs font-bold ${today ? "text-blue-700" : "text-slate-500"}`}>
                    {w[metric] > 0 ? `$${Math.round(w[metric] / 1000)}k` : "-"}
                  </span>
                  <div
                    className={`w-full max-w-14 rounded-2xl transition-all duration-500 ${
                      today ? "bg-gradient-to-t from-blue-600 to-sky-400 shadow-glow" : "bg-gradient-to-t from-slate-200 to-slate-100"
                    }`}
                    style={{ height: `${Math.max((w[metric] / maxWeek) * 78, 3)}%` }}
                  />
                  <span className={`text-xs font-semibold capitalize ${today ? "text-blue-700" : "text-slate-500"}`}>{today ? "Hoy" : w.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="section-title">Más vendidos</h2>
          <p className="section-sub mb-5">Unidades de los últimos 7 días</p>
          <ul className="space-y-4">
            {data.top.map((t, i) => (
              <li key={t.name}>
                <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{i + 1}</span>
                    <span className="truncate font-medium text-slate-800">{t.name}</span>
                  </span>
                  <span className="shrink-0 font-bold text-slate-900">{t.qty} u.</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-teal-400" style={{ width: `${(t.qty / maxTop) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="card p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title">Últimas ventas</h2>
            <TrendingUp size={18} className="text-teal-500" />
          </div>
          <ul className="divide-y divide-slate-100">
            {data.recent.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{s.id}</p>
                  <p className="truncate text-xs text-slate-500">{formatDateTime(s.date)}</p>
                </div>
                <span className="chip chip-info">{PAY_LABEL[s.payment]}</span>
                <span className="w-24 text-right text-sm font-bold text-slate-900">{formatMoney(s.total)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title">Productos por reponer</h2>
            {lowStock.length > 0 && (
              <button onClick={() => setScreen("restock")} className="text-xs font-semibold text-blue-600 hover:underline">
                Armar pedido →
              </button>
            )}
          </div>
          {lowStock.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Todo el stock está en orden.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lowStock.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-500">Mínimo recomendado: {p.minStock}</p>
                  </div>
                  <span className={`chip ${p.stock === 0 ? "chip-bad" : "chip-warn"}`}>{p.stock === 0 ? "Sin stock" : `Quedan ${p.stock}`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
