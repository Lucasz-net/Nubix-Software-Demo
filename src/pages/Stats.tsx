import { useMemo, useState } from "react";
import { AlertCircle, CalendarDays, Clock, Crown, HandCoins, Package, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStore } from "../store/useStore";
import { AreaChart, BarChart, Donut, compactMoney } from "../components/charts";
import { formatMoney } from "../lib/format";
import { PAY_LABEL } from "../lib/payments";
import { daysBack, isActive, saleProfit, totalsOf } from "../lib/sales";
import { categoryStyle } from "../lib/categories";
import type { PayMethod, Sale } from "../types";

const PERIODS = [7, 15, 30] as const;
type Metric = "ventas" | "ganancia";
type Ranking = "units" | "profit" | "idle";

const PAY_COLOR: Record<PayMethod, string> = {
  efectivo: "#2563eb",
  mercadopago: "#38bdf8",
  debito: "#0f2a5c",
  transferencia: "#2dd4bf",
  fiado: "#f59e0b",
};

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7; // lunes = 0

const inRange = (s: Sale, a: number, b: number) => {
  const t = new Date(s.date).getTime();
  return t >= a && t < b;
};

function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (prev <= 0) return <span className="text-xs text-slate-400">sin datos previos</span>;
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return <span className="chip bg-slate-100 text-slate-600">= igual que antes</span>;
  return (
    <span className={`chip ${pct > 0 ? "chip-ok" : "chip-bad"}`}>
      {pct > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {pct > 0 ? "+" : ""}{pct}% vs. período anterior
    </span>
  );
}

function Insight({ icon: Icon, label, value, hint, tile }: { icon: LucideIcon; label: string; value: string; hint: string; tile: string }) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <span className={`icon-tile h-12 w-12 bg-gradient-to-br text-white shadow-lg ${tile}`}><Icon size={22} /></span>
      <div className="min-w-0">
        <p className="kpi-label">{label}</p>
        <p className="truncate text-lg font-extrabold tracking-tight text-slate-900">{value}</p>
        <p className="truncate text-xs text-slate-500">{hint}</p>
      </div>
    </div>
  );
}

export default function Stats() {
  const allSales = useStore((s) => s.sales);
  const products = useStore((s) => s.products);
  const customers = useStore((s) => s.customers);
  const movements = useStore((s) => s.customerMovements);

  const [days, setDays] = useState<(typeof PERIODS)[number]>(7);
  const [metric, setMetric] = useState<Metric>("ventas");
  const [ranking, setRanking] = useState<Ranking>("units");

  const d = useMemo(() => {
    const active = allSales.filter(isActive);
    const start = daysBack(days - 1).getTime();
    const prevStart = daysBack(days * 2 - 1).getTime();
    const end = daysBack(-1).getTime();
    const cur = active.filter((s) => inRange(s, start, end));
    const prev = active.filter((s) => inRange(s, prevStart, start));

    // Serie diaria del período y del anterior, alineadas por posición.
    const series = Array.from({ length: days }, (_, i) => {
      const day = daysBack(days - 1 - i);
      const a = day.getTime();
      const b = a + 86400000;
      const pa = daysBack(days * 2 - 1 - i).getTime();
      const dayCur = cur.filter((s) => inRange(s, a, b));
      const dayPrev = prev.filter((s) => inRange(s, pa, pa + 86400000));
      return {
        date: day,
        ventas: dayCur.reduce((s, x) => s + x.total, 0),
        ganancia: dayCur.reduce((s, x) => s + saleProfit(x), 0),
        pVentas: dayPrev.reduce((s, x) => s + x.total, 0),
        pGanancia: dayPrev.reduce((s, x) => s + saleProfit(x), 0),
      };
    });

    // Por hora (en ventas $).
    const hourly = new Array<number>(24).fill(0);
    cur.forEach((s) => (hourly[new Date(s.date).getHours()] += s.total));
    const used = hourly.map((v, h) => (v > 0 ? h : -1)).filter((h) => h >= 0);
    const h0 = Math.min(8, ...used);
    const h1 = Math.max(21, ...used);
    const hours = Array.from({ length: h1 - h0 + 1 }, (_, i) => ({ label: String(h0 + i), value: hourly[h0 + i] }));

    // Promedio de venta por cada día de la semana.
    const wdTotal = new Array<number>(7).fill(0);
    const wdDays = new Array<number>(7).fill(0);
    series.forEach((p) => {
      wdTotal[weekdayIndex(p.date)] += p.ventas;
      wdDays[weekdayIndex(p.date)]++;
    });
    const weekdays = WEEKDAYS.map((label, i) => ({ label, value: wdDays[i] ? Math.round(wdTotal[i] / wdDays[i]) : 0 }));

    // Medios de pago.
    const pay = new Map<PayMethod, number>();
    cur.forEach((s) => pay.set(s.payment, (pay.get(s.payment) ?? 0) + s.total));

    // Productos y categorías.
    const categoryOf = new Map(products.map((p) => [p.id, p.category]));
    const prod = new Map<string, { name: string; units: number; profit: number }>();
    const cat = new Map<string, { revenue: number; profit: number }>();
    cur.forEach((s) =>
      s.items.forEach((i) => {
        const p = prod.get(i.productId) ?? { name: i.name, units: 0, profit: 0 };
        p.units += i.qty;
        p.profit += i.qty * (i.price - i.cost);
        prod.set(i.productId, p);
        const c = categoryOf.get(i.productId) ?? "Otros";
        const e = cat.get(c) ?? { revenue: 0, profit: 0 };
        e.revenue += i.qty * i.price;
        e.profit += i.qty * (i.price - i.cost);
        cat.set(c, e);
      }),
    );
    const idle = products
      .filter((p) => !prod.has(p.id) && p.stock > 0)
      .map((p) => ({ name: p.name, category: p.category, stock: p.stock, tied: p.stock * p.cost }))
      .sort((a, b) => b.tied - a.tied);

    return {
      cur: totalsOf(cur),
      prev: totalsOf(prev),
      series,
      hours,
      weekdays,
      pay: [...pay.entries()].map(([method, value]) => ({ method, value })).sort((a, b) => b.value - a.value),
      prod: [...prod.values()],
      cat: [...cat.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue),
      idle,
      fiadoGiven: movements.filter((m) => m.type === "compra" && new Date(m.date).getTime() >= start).reduce((s, m) => s + m.amount, 0),
      fiadoPaid: movements.filter((m) => m.type === "pago" && new Date(m.date).getTime() >= start).reduce((s, m) => s + m.amount, 0),
    };
  }, [allSales, products, movements, days]);

  const debtors = customers.filter((c) => c.balance > 0);
  const totalDebt = debtors.reduce((s, c) => s + c.balance, 0);

  const bestDay = d.series.reduce((a, b) => (b.ventas > a.ventas ? b : a), d.series[0]);
  const peak = d.hours.reduce((a, b) => (b.value > a.value ? b : a), d.hours[0]);
  const topCat = d.cat[0];
  const topProd = [...d.prod].sort((a, b) => b.units - a.units)[0];
  const hasSales = d.cur.count > 0;

  const points = d.series.map((p) => ({
    label: p.date.toLocaleDateString("es-AR", { day: "numeric", month: "numeric" }),
    title: p.date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" }),
    value: metric === "ventas" ? p.ventas : p.ganancia,
    prev: metric === "ventas" ? p.pVentas : p.pGanancia,
  }));

  const payTotal = d.pay.reduce((s, p) => s + p.value, 0);
  const maxCat = Math.max(...d.cat.map((c) => c.revenue), 1);

  const rank = useMemo(() => {
    if (ranking === "idle") return [];
    const key = ranking === "units" ? "units" : "profit";
    return [...d.prod].sort((a, b) => b[key] - a[key]).slice(0, 8);
  }, [d.prod, ranking]);
  const maxRank = Math.max(...rank.map((r) => (ranking === "units" ? r.units : r.profit)), 1);

  const kpis = [
    { label: "Total vendido", value: formatMoney(d.cur.total), cur: d.cur.total, prev: d.prev.total, icon: Wallet, tile: "from-blue-600 to-sky-400" },
    { label: "Ganancia estimada", value: formatMoney(d.cur.profit), cur: d.cur.profit, prev: d.prev.profit, icon: TrendingUp, tile: "from-teal-400 to-teal-600" },
    { label: "Ventas realizadas", value: String(d.cur.count), cur: d.cur.count, prev: d.prev.count, icon: Receipt, tile: "from-sky-400 to-teal-500" },
    { label: "Ticket promedio", value: formatMoney(d.cur.avg), cur: d.cur.avg, prev: d.prev.avg, icon: Receipt, tile: "from-blue-500 to-indigo-600" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="section-sub">Los números de los últimos <b className="text-slate-800">{days} días</b>, comparados con los {days} anteriores.</p>
        <div className="flex rounded-full bg-white/80 p-1 text-xs font-semibold shadow-card">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setDays(p)}
              className={`rounded-full px-5 py-1.5 transition ${days === p ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"}`}
            >
              {p} días
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card p-5">
            <div className="flex items-center gap-3">
              <span className={`icon-tile h-11 w-11 bg-gradient-to-br text-white shadow-lg ${k.tile}`}><k.icon size={20} /></span>
              <p className="kpi-label">{k.label}</p>
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{k.value}</p>
            <div className="mt-1.5 min-h-6"><Delta cur={k.cur} prev={k.prev} /></div>
          </div>
        ))}
      </div>

      {hasSales && (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Insight icon={CalendarDays} label="Mejor día" value={bestDay.date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" })} hint={`${formatMoney(bestDay.ventas)} vendidos`} tile="from-blue-600 to-sky-400" />
          <Insight icon={Clock} label="Hora pico" value={`${peak.label}:00 a ${Number(peak.label) + 1}:00 hs`} hint={`${formatMoney(peak.value)} en el período`} tile="from-sky-400 to-teal-500" />
          <Insight icon={Crown} label="Categoría estrella" value={topCat.name} hint={`${Math.round((topCat.revenue / d.cur.total) * 100)}% de las ventas`} tile="from-amber-400 to-orange-500" />
          <Insight icon={Package} label="Producto más vendido" value={topProd.name} hint={`${topProd.units} unidades`} tile="from-teal-400 to-teal-600" />
        </div>
      )}

      {!hasSales && (
        <div className="card flex items-center gap-3 p-6 text-slate-500"><AlertCircle size={20} /> No hay ventas en este período.</div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="card p-6 xl:col-span-2">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="section-title">Evolución día por día</h2>
              <p className="section-sub flex items-center gap-3">
                {metric === "ventas" ? "Total vendido por día" : "Ganancia estimada por día"}
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="inline-block h-0 w-5 border-t-2 border-dashed border-slate-300" /> período anterior
                </span>
              </p>
            </div>
            <div className="flex rounded-full bg-slate-100 p-1 text-xs font-semibold">
              {(["ventas", "ganancia"] as const).map((m) => (
                <button key={m} onClick={() => setMetric(m)} className={`rounded-full px-4 py-1.5 capitalize transition ${metric === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <AreaChart points={points} format={formatMoney} />
        </section>

        <section className="card p-6">
          <h2 className="section-title">¿Cómo te pagan?</h2>
          <p className="section-sub mb-3">Ventas por medio de pago</p>
          <Donut
            slices={d.pay.map((p) => ({ label: PAY_LABEL[p.method], value: p.value, color: PAY_COLOR[p.method] }))}
            centerTop={compactMoney(payTotal)}
            centerBottom="vendido"
          />
          <ul className="mt-4 space-y-2.5">
            {d.pay.map((p) => (
              <li key={p.method} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 whitespace-nowrap text-[13px] font-medium text-slate-700">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: PAY_COLOR[p.method] }} />
                  {PAY_LABEL[p.method]}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{formatMoney(p.value)}</span>
                  <span className="w-10 text-right text-xs font-semibold text-slate-400">{Math.round((p.value / payTotal) * 100)}%</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="card p-6">
          <h2 className="section-title">Ventas por hora del día</h2>
          <p className="section-sub mb-2">Cuándo hay más movimiento (en pesos). Útil para organizar turnos.</p>
          <BarChart items={d.hours} format={compactMoney} />
        </section>
        <section className="card p-6">
          <h2 className="section-title">Ventas por día de la semana</h2>
          <p className="section-sub mb-2">Cuánto vendés en promedio cada día.</p>
          <BarChart items={d.weekdays} format={compactMoney} />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="card p-6">
          <h2 className="section-title">Ventas y margen por categoría</h2>
          <p className="section-sub mb-4">Qué rubros mueven más plata y cuáles dejan más ganancia.</p>
          <ul className="space-y-4">
            {d.cat.map((c) => {
              const { icon: Icon, tile } = categoryStyle(c.name);
              const m = c.revenue ? Math.round((c.profit / c.revenue) * 100) : 0;
              return (
                <li key={c.name}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2.5 font-semibold text-slate-800">
                      <span className={`icon-tile h-8 w-8 bg-gradient-to-br text-white ${tile}`}><Icon size={15} /></span>
                      {c.name}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={`chip ${m < 20 ? "chip-warn" : "chip-ok"}`}>Margen {m}%</span>
                      <span className="w-24 text-right font-bold text-slate-900">{formatMoney(c.revenue)}</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-teal-400" style={{ width: `${(c.revenue / maxCat) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="section-title">Ranking de productos</h2>
              <p className="section-sub">
                {ranking === "units" ? "Los que más se venden (unidades)" : ranking === "profit" ? "Los que más ganancia dejan" : "Con stock pero sin ventas en el período"}
              </p>
            </div>
            <div className="flex rounded-full bg-slate-100 p-1 text-xs font-semibold">
              {([["units", "Más vendidos"], ["profit", "Más ganancia"], ["idle", "Sin movimiento"]] as [Ranking, string][]).map(([id, label]) => (
                <button key={id} onClick={() => setRanking(id)} className={`rounded-full px-3.5 py-1.5 transition ${ranking === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {ranking !== "idle" ? (
            <ul className="space-y-3.5">
              {rank.map((r, i) => {
                const v = ranking === "units" ? r.units : r.profit;
                return (
                  <li key={r.name}>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{i + 1}</span>
                        <span className="truncate font-medium text-slate-800">{r.name}</span>
                      </span>
                      <span className="shrink-0 font-bold text-slate-900">{ranking === "units" ? `${v} u.` : formatMoney(v)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-teal-400" style={{ width: `${(v / maxRank) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
              {rank.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Sin ventas en el período.</p>}
            </ul>
          ) : d.idle.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Todos tus productos tuvieron ventas. ¡Muy bien!</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.idle.slice(0, 8).map((p) => (
                <li key={p.name} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.category} · {p.stock} u. en stock</p>
                  </div>
                  <span className="chip chip-warn">{formatMoney(p.tied)} parados</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="icon-tile h-11 w-11 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg"><HandCoins size={20} /></span>
          <div>
            <h2 className="section-title">Fiado</h2>
            <p className="section-sub">Cuánta plata está en la calle y cómo se mueve.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-amber-50 p-4">
            <p className="kpi-label text-amber-700">Deuda total hoy</p>
            <p className="text-2xl font-extrabold text-slate-900">{formatMoney(totalDebt)}</p>
            <p className="text-xs text-slate-500">{debtors.length} cliente{debtors.length === 1 ? "" : "s"} con deuda</p>
          </div>
          <div className="rounded-2xl bg-blue-50 p-4">
            <p className="kpi-label text-blue-700">Fiado otorgado ({days} días)</p>
            <p className="text-2xl font-extrabold text-slate-900">{formatMoney(d.fiadoGiven)}</p>
            <p className="text-xs text-slate-500">compras a cuenta</p>
          </div>
          <div className="rounded-2xl bg-teal-50 p-4">
            <p className="kpi-label text-teal-700">Cobrado de deudas ({days} días)</p>
            <p className="text-2xl font-extrabold text-slate-900">{formatMoney(d.fiadoPaid)}</p>
            <p className="text-xs text-slate-500">pagos recibidos de clientes</p>
          </div>
        </div>
      </section>
    </div>
  );
}
