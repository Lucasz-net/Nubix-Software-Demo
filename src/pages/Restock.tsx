import { useState } from "react";
import { Copy, MessageCircle, PackageCheck } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useStore } from "../store/useStore";
import Toast from "../components/Toast";
import { formatMoney } from "../lib/format";
import { categoryStyle } from "../lib/categories";

const suggested = (stock: number, min: number) => Math.max(min * 2 - stock, 1);

export default function Restock() {
  const products = useStore((s) => s.products);
  const restock = useStore((s) => s.restock);
  const low = products.filter((p) => p.stock <= p.minStock).sort((a, b) => a.stock / (a.minStock || 1) - b.stock / (b.minStock || 1));

  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [phone, setPhone] = useState("");
  const [toast, setToast] = useState<{ title: string; detail?: string } | null>(null);

  const qtyOf = (id: string, stock: number, min: number) => qtys[id] ?? suggested(stock, min);
  const order = low
    .map((p) => ({ p, qty: qtyOf(p.id, p.stock, p.minStock) }))
    .filter((l) => l.qty > 0);
  const estimated = order.reduce((s, l) => s + l.qty * l.p.cost, 0);
  const text = `Hola! Necesito reponer mercadería:\n${order.map((l) => `- ${l.qty} x ${l.p.name}`).join("\n")}\n\nGracias!`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setToast({ title: "Pedido copiado", detail: "Listo para pegar donde quieras." });
    } catch {
      setToast({ title: "No se pudo copiar el pedido" });
    }
  };

  const whatsapp = async () => {
    const digits = phone.replace(/\D/g, "");
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
    try {
      await openUrl(url);
    } catch {
      window.open(url, "_blank"); // fuera de Tauri (navegador)
    }
  };

  if (low.length === 0) {
    return (
      <div className="card mx-auto mt-10 max-w-md p-12 text-center">
        <span className="icon-tile mx-auto mb-4 h-16 w-16 bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-lg">
          <PackageCheck size={30} />
        </span>
        <p className="text-xl font-bold text-slate-900">Todo el stock está en orden</p>
        <p className="section-sub">No hay productos por debajo del mínimo.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <section className="card overflow-hidden xl:col-span-2">
        <div className="px-6 pb-3 pt-5">
          <h2 className="section-title">{low.length} productos para reponer</h2>
          <p className="section-sub">Ajustá la cantidad a pedir. Con 0, el producto queda fuera del pedido.</p>
        </div>
        <table className="w-full text-sm">
          <thead className="border-y border-slate-100 bg-slate-50/70">
            <tr>
              <th className="th">Producto</th>
              <th className="th">Stock actual</th>
              <th className="th">Cantidad a pedir</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {low.map((p) => {
              const qty = qtyOf(p.id, p.stock, p.minStock);
              const { icon: Icon, tile } = categoryStyle(p.category);
              return (
                <tr key={p.id} className="hover:bg-blue-50/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`icon-tile h-10 w-10 bg-gradient-to-br text-white ${tile}`}><Icon size={18} /></span>
                      <div>
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`chip ${p.stock === 0 ? "chip-bad" : "chip-warn"}`}>
                      {p.stock === 0 ? "Sin stock" : `Quedan ${p.stock}`} · mín. {p.minStock}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <input
                      type="number"
                      min={0}
                      value={qty}
                      onChange={(e) => setQtys((q) => ({ ...q, [p.id]: Math.max(0, Number(e.target.value)) }))}
                      className="input w-24 text-center font-bold"
                    />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      disabled={qty === 0}
                      onClick={() => {
                        restock(p.id, qty);
                        setQtys(({ [p.id]: _, ...rest }) => rest);
                        setToast({ title: "Mercadería recibida", detail: `+${qty} ${p.name}` });
                      }}
                      className="btn btn-soft btn-sm"
                    >
                      Ya llegó
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="card h-fit p-6">
        <h2 className="section-title">Pedido al proveedor</h2>
        <p className="section-sub mb-4">
          {order.length} productos · costo estimado <span className="font-bold text-slate-900">{formatMoney(estimated)}</span>
        </p>
        <pre className="mb-4 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 font-sans text-sm leading-relaxed text-slate-700">{text}</pre>
        <label className="mb-4 block">
          <span className="field-label">WhatsApp del proveedor (opcional)</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 5493511234567" className="input" />
        </label>
        <div className="flex flex-col gap-2.5">
          <button onClick={whatsapp} disabled={order.length === 0} className="btn btn-aqua w-full">
            <MessageCircle size={18} /> Enviar por WhatsApp
          </button>
          <button onClick={copy} disabled={order.length === 0} className="btn btn-ghost w-full">
            <Copy size={16} /> Copiar
          </button>
        </div>
      </section>

      {toast && <Toast title={toast.title} detail={toast.detail} onDone={() => setToast(null)} />}
    </div>
  );
}
