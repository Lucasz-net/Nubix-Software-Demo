import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Pencil, Plus, Search, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useCurrentUser, useStore } from "../store/useStore";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import ProductForm from "../components/ProductForm";
import { CATEGORIES } from "../data/mock";
import { formatMoney, margin } from "../lib/format";
import { newPrice } from "../lib/pricing";
import { categoryStyle } from "../lib/categories";
import type { Rounding } from "../lib/pricing";
import type { Product } from "../types";

const ROUNDINGS: { value: Rounding; label: string }[] = [
  { value: 0, label: "Al peso" },
  { value: 10, label: "A $10" },
  { value: 50, label: "A $50" },
  { value: 100, label: "A $100" },
];

function PriceAdjustForm({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const products = useStore((s) => s.products);
  const adjustPrices = useStore((s) => s.adjustPrices);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [percent, setPercent] = useState("");
  const [category, setCategory] = useState("");
  const [rounding, setRounding] = useState<Rounding>(0);

  const value = Number(percent);
  const signed = direction * value;
  const valid = value > 0 && (direction === 1 || value < 100);

  const preview = useMemo(
    () =>
      products
        .filter((p) => !category || p.category === category)
        .map((p) => ({ p, next: newPrice(p.price, signed, rounding) })),
    [products, category, signed, rounding],
  );
  const changed = preview.filter((r) => r.next !== r.p.price).length;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const n = adjustPrices({ percent: signed, category: category || null, rounding });
    onDone(`${n} precios ${direction === 1 ? "aumentados" : "reducidos"} un ${value}%`);
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-2 gap-2 rounded-full bg-slate-100 p-1">
        {([1, -1] as const).map((d) => (
          <button
            type="button"
            key={d}
            onClick={() => setDirection(d)}
            className={`flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition ${
              direction === d ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {d === 1 ? <TrendingUp size={16} className="text-teal-600" /> : <TrendingDown size={16} className="text-red-500" />}
            {d === 1 ? "Aumentar" : "Bajar"}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="field-label">{direction === 1 ? "¿Qué porcentaje (%) deseas aumentar?" : "¿Qué porcentaje (%) deseas bajar?"}</span>
        <div className="relative">
          <input
            autoFocus
            type="number"
            min={0.1}
            step="any"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            placeholder="Ej: 15"
            className="input py-3.5 pr-12 text-2xl font-bold"
          />
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">%</span>
        </div>
        <div className="mt-2 flex gap-2">
          {[5, 10, 15, 20].map((n) => (
            <button type="button" key={n} onClick={() => setPercent(String(n))} className="btn btn-ghost btn-sm">
              {n}%
            </button>
          ))}
        </div>
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label>
          <span className="field-label">Aplicar a</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
            <option value="">Todos los productos</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>
          <span className="field-label">Redondear precios</span>
          <select value={rounding} onChange={(e) => setRounding(Number(e.target.value) as Rounding)} className="input">
            {ROUNDINGS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </label>
      </div>

      {valid && (
        <div>
          <p className="field-label">Vista previa · {changed} precios cambian</p>
          <div className="max-h-52 overflow-y-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {preview.map(({ p, next }) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 font-medium text-slate-700">{p.name}</td>
                    <td className="px-4 py-2 text-right text-slate-400 line-through">{formatMoney(p.price)}</td>
                    <td className={`px-4 py-2 text-right font-bold ${next > p.price ? "text-teal-600" : next < p.price ? "text-red-500" : "text-slate-500"}`}>
                      {formatMoney(next)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
        <button disabled={!valid || changed === 0} className="btn btn-primary">
          Aplicar a {changed} productos
        </button>
      </div>
    </form>
  );
}

type StockFilter = "all" | "ok" | "low" | "out";
type SortKey = "name" | "category" | "cost" | "price" | "margin" | "stock";

const stockState = (p: Product): Exclude<StockFilter, "all"> => (p.stock === 0 ? "out" : p.stock <= p.minStock ? "low" : "ok");

const STOCK_FILTERS: { id: StockFilter; label: string; tone: string }[] = [
  { id: "all", label: "Todos", tone: "" },
  { id: "ok", label: "Stock normal", tone: "bg-teal-500" },
  { id: "low", label: "Stock bajo", tone: "bg-amber-400" },
  { id: "out", label: "Sin stock", tone: "bg-red-500" },
];

// adminOnly: el cajero consulta precio y stock, pero no ve costos ni puede editar.
const COLUMNS: { label: string; key: SortKey | null; right?: boolean; adminOnly?: boolean }[] = [
  { label: "Producto", key: "name" },
  { label: "Categoría", key: "category" },
  { label: "Costo", key: "cost", right: true, adminOnly: true },
  { label: "Precio de venta", key: "price", right: true },
  { label: "Margen", key: "margin", right: true, adminOnly: true },
  { label: "Stock", key: "stock" },
  { label: "", key: null, adminOnly: true },
];

const sortValue = (p: Product, key: SortKey) => (key === "margin" ? margin(p.cost, p.price) : p[key]);

const pill = (active: boolean) =>
  `flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
    active ? "bg-slate-900 text-white shadow-card" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
  }`;
const pillCount = (active: boolean) => `rounded-full px-1.5 text-[11px] ${active ? "bg-white/20" : "bg-white text-slate-500"}`;

export default function Inventory() {
  const products = useStore((s) => s.products);
  const deleteProduct = useStore((s) => s.deleteProduct);
  const isAdmin = useCurrentUser()?.role === "admin";
  const columns = COLUMNS.filter((c) => isAdmin || !c.adminOnly);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });
  const [modal, setModal] = useState<"new" | "price" | Product | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const q = query.trim().toLowerCase();

  // Cada grupo de filtros cuenta teniendo en cuenta los otros, así los números coinciden con lo que se ve.
  const { rows, categoryCounts, stockCounts } = useMemo(() => {
    const byQuery = products.filter((p) => !q || p.name.toLowerCase().includes(q) || p.barcode.includes(q));
    const byCategory = (p: Product) => !category || p.category === category;
    const byStock = (p: Product) => stockFilter === "all" || stockState(p) === stockFilter;

    const categoryCounts = new Map<string, number>();
    byQuery.filter(byStock).forEach((p) => categoryCounts.set(p.category, (categoryCounts.get(p.category) ?? 0) + 1));
    const stockCounts = { all: 0, ok: 0, low: 0, out: 0 };
    byQuery.filter(byCategory).forEach((p) => { stockCounts.all++; stockCounts[stockState(p)]++; });

    const rows = byQuery.filter((p) => byCategory(p) && byStock(p)).sort((a, b) => {
      const x = sortValue(a, sort.key);
      const y = sortValue(b, sort.key);
      const c = typeof x === "string" ? x.localeCompare(y as string, "es") : (x as number) - (y as number);
      return c * sort.dir || a.name.localeCompare(b.name, "es");
    });
    return { rows, categoryCounts, stockCounts };
  }, [products, q, category, stockFilter, sort]);

  const categories = useMemo(() => [...new Set([...CATEGORIES, ...products.map((p) => p.category)])], [products]);
  const hasFilters = !!category || stockFilter !== "all" || !!q;
  const clearFilters = () => { setCategory(null); setStockFilter("all"); setQuery(""); };
  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  const close = () => setModal(null);
  const done = (msg: string) => {
    close();
    setToast(msg);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative w-96">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o código de barras..."
              className="w-full rounded-full border border-white bg-white py-3 pl-11 pr-4 text-sm shadow-card outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
            />
          </div>
          <span className="chip chip-info">{hasFilters ? `${rows.length} de ${products.length} productos` : `${products.length} productos`}</span>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs font-semibold text-blue-600 hover:underline">Limpiar filtros</button>
          )}
        </div>
        {isAdmin ? (
          <div className="flex gap-3">
            <button onClick={() => setModal("price")} className="btn btn-aqua">
              <TrendingUp size={18} /> Aumentar Precios
            </button>
            <button onClick={() => setModal("new")} className="btn btn-primary">
              <Plus size={18} /> Nuevo Producto
            </button>
          </div>
        ) : (
          <span className="chip chip-info px-3.5 py-1.5 text-sm"><Eye size={15} /> Solo consulta de precios y stock</span>
        )}
      </div>

      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="kpi-label mr-1 w-20">Categoría</span>
          {[null, ...categories].map((c) => {
            const count = c === null ? [...categoryCounts.values()].reduce((a, b) => a + b, 0) : categoryCounts.get(c) ?? 0;
            const active = category === c;
            return (
              <button key={c ?? "all"} onClick={() => setCategory(c)} className={pill(active)}>
                {c ?? "Todas"}
                <span className={pillCount(active)}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="kpi-label mr-1 w-20">Stock</span>
          {STOCK_FILTERS.map((f) => {
            const active = stockFilter === f.id;
            return (
              <button key={f.id} onClick={() => setStockFilter(f.id)} className={pill(active)}>
                {f.tone && <span className={`h-2 w-2 rounded-full ${f.tone}`} />}
                {f.label}
                <span className={pillCount(active)}>{stockCounts[f.id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/70">
            <tr>
              {columns.map((c, i) => {
                const active = c.key !== null && sort.key === c.key;
                const SortIcon = !active ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
                return (
                  <th key={i} className={`th ${c.right ? "text-right" : ""}`} aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
                    {c.key ? (
                      <button
                        onClick={() => toggleSort(c.key!)}
                        className={`inline-flex items-center gap-1 uppercase tracking-wider transition hover:text-slate-900 ${active ? "text-blue-700" : ""}`}
                      >
                        {c.label}
                        <SortIcon size={12} className={active ? "" : "opacity-40"} />
                      </button>
                    ) : c.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((p) => {
              const m = margin(p.cost, p.price);
              const { icon: Icon, tile } = categoryStyle(p.category);
              return (
                <tr key={p.id} className="transition hover:bg-blue-50/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`icon-tile h-10 w-10 bg-gradient-to-br text-white ${tile}`}><Icon size={18} /></span>
                      <div>
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        <p className="font-mono text-[11px] text-slate-400">{p.barcode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3"><span className="chip chip-info">{p.category}</span></td>
                  {isAdmin && <td className="px-5 py-3 text-right text-slate-500">{formatMoney(p.cost)}</td>}
                  <td className="px-5 py-3 text-right text-base font-bold text-slate-900">{formatMoney(p.price)}</td>
                  {isAdmin && (
                    <td className="px-5 py-3 text-right"><span className={`chip ${m < 15 ? "chip-warn" : "chip-ok"}`}>{m.toFixed(0)}%</span></td>
                  )}
                  <td className="px-5 py-3">
                    <span className={`chip ${p.stock === 0 ? "chip-bad" : p.stock <= p.minStock ? "chip-warn" : "chip-ok"}`}>
                      {p.stock === 0 ? "Sin stock" : `${p.stock} u.`}
                    </span>
                  </td>
                  {isAdmin && <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setModal(p)} aria-label="Editar" className="rounded-full p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600">
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => window.confirm(`¿Eliminar "${p.name}"?`) && deleteProduct(p.id)}
                        aria-label="Eliminar"
                        className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-500">
                  No hay productos que coincidan.{" "}
                  {hasFilters && <button onClick={clearFilters} className="font-semibold text-blue-600 hover:underline">Limpiar filtros</button>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal === "price" && (
        <Modal title="Actualización masiva de precios" subtitle="Cambiá todos los precios de una vez. Mirá cómo quedan antes de confirmar." onClose={close} wide>
          <PriceAdjustForm onClose={close} onDone={done} />
        </Modal>
      )}
      {modal === "new" && (
        <Modal title="Nuevo producto" onClose={close}><ProductForm product={null} onClose={close} onDone={done} /></Modal>
      )}
      {modal && typeof modal === "object" && (
        <Modal title="Editar producto" onClose={close}><ProductForm product={modal} onClose={close} onDone={done} /></Modal>
      )}
      {toast && <Toast title={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
