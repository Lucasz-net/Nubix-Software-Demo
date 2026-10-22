import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Minus, Plus, ReceiptText, ScanBarcode, Search, Trash2, Wallet } from "lucide-react";
import { useCurrentUser, useStore } from "../store/useStore";
import PaymentModal from "../components/PaymentModal";
import Modal from "../components/Modal";
import OwnerPinModal from "../components/OwnerPinModal";
import ProductForm from "../components/ProductForm";
import InvoiceModal from "../components/InvoiceModal";
import Toast from "../components/Toast";
import { formatMoney, splitIva } from "../lib/format";
import { PAY_LABEL } from "../lib/payments";
import { categoryStyle } from "../lib/categories";
import { formatInvoiceNumber } from "../lib/invoice";
import type { InvoiceTarget, PayMethod } from "../types";

export default function POS() {
  const products = useStore((s) => s.products);
  const cart = useStore((s) => s.cart);
  const cashOpen = useStore((s) => !!s.cash.current);
  const { addToCart, changeQty, removeFromCart, checkout, setScreen } = useStore.getState();
  const isAdmin = useCurrentUser()?.role === "admin";

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState<{ title: string; detail?: string; invoiceOf?: string } | null>(null);
  const [invoiceOf, setInvoiceOf] = useState<string | null>(null); // venta cuya factura se está viendo
  // Código escaneado que no está cargado: se da de alta en el momento (el cajero necesita el PIN del dueño).
  const [newProduct, setNewProduct] = useState<{ code: string; authorized: boolean } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!category || p.category === category) &&
        (!q || p.name.toLowerCase().includes(q) || p.barcode.includes(q)),
    );
  }, [products, query, category]);

  const lines = cart.flatMap((c) => {
    const product = products.find((p) => p.id === c.productId);
    return product ? [{ product, qty: c.qty }] : [];
  });
  const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const units = lines.reduce((s, l) => s + l.qty, 0);
  const { net, iva } = splitIva(total);
  const canCharge = lines.length > 0 && cashOpen;

  // Atajos: F2 enfoca la búsqueda, F9 cobra.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (e.key === "F9") {
        e.preventDefault();
        if (canCharge && !newProduct && !invoiceOf) setPayOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canCharge, newProduct, invoiceOf]);

  useEffect(() => {
    if (!notFound) return;
    const t = setTimeout(() => setNotFound(false), 2500);
    return () => clearTimeout(t);
  }, [notFound]);

  // Enter en la búsqueda: lo que dispara un lector de código de barras.
  const onSearchEnter = () => {
    const q = query.trim();
    if (!q) return;
    const exact = products.find((p) => p.barcode === q);
    const target = exact ?? (filtered.length === 1 ? filtered[0] : null);
    if (target) {
      addToCart(target.id);
      setQuery("");
    } else if (/^\d{6,}$/.test(q)) {
      setNewProduct({ code: q, authorized: isAdmin });
    } else {
      setNotFound(true);
    }
  };

  // Se limpia la búsqueda: si no, el próximo escaneo se pegaría al código anterior.
  const closeNewProduct = () => {
    setNewProduct(null);
    setQuery("");
    searchRef.current?.focus();
  };

  const onProductCreated = (productId: string) => {
    const product = useStore.getState().products.find((p) => p.id === productId);
    closeNewProduct();
    if (!product) return;
    if (product.stock > 0) addToCart(product.id);
    setToast({
      title: "Producto cargado",
      detail: product.stock > 0 ? `${product.name} · agregado al ticket` : `${product.name} · sin stock, no se agregó al ticket`,
    });
  };

  const handlePay = (method: PayMethod, opts: { customerId?: string; received?: number; target: InvoiceTarget }) => {
    const sale = checkout(method, opts.customerId, opts.target);
    setPayOpen(false);
    if (!sale) return;
    const change = method === "efectivo" && opts.received ? opts.received - sale.total : 0;
    setToast({
      title: sale.invoice ? `Venta cobrada · Factura ${sale.invoice.letter} ${formatInvoiceNumber(sale.invoice)}` : `Venta ${sale.id} cobrada`,
      detail: `${PAY_LABEL[method]} · ${formatMoney(sale.total)}${change > 0 ? ` · Vuelto ${formatMoney(change)}` : ""}`,
      invoiceOf: sale.invoice ? sale.id : undefined,
    });
    searchRef.current?.focus();
  };

  return (
    <div className="flex h-full gap-6">
      <div className="flex min-w-0 flex-[7] flex-col">
        {!cashOpen && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
            <span className="flex items-center gap-2 font-semibold">
              <AlertTriangle size={18} /> La caja está cerrada. Abrila para poder cobrar.
            </span>
            <button onClick={() => setScreen("cash")} className="btn btn-sm bg-amber-500 text-white hover:bg-amber-600">
              <Wallet size={14} /> Abrir caja
            </button>
          </div>
        )}

        <div className="relative mb-3">
          <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearchEnter()}
            placeholder="Buscar producto o escanear código de barras..."
            className={`w-full rounded-full border bg-white py-4 pl-14 pr-44 text-base shadow-card outline-none transition focus:ring-4 ${
              notFound ? "border-red-400 focus:ring-red-200/60" : "border-white focus:border-blue-500 focus:ring-blue-500/15"
            }`}
          />
          <span className="absolute right-5 top-1/2 flex -translate-y-1/2 items-center gap-2 text-xs font-semibold">
            {notFound ? (
              <span className="chip chip-bad">Código no encontrado</span>
            ) : (
              <>
                <ScanBarcode size={16} className="text-slate-400" />
                <kbd className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-500">F2</kbd>
                <span className="text-slate-400">buscar</span>
              </>
            )}
          </span>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {[null, ...categories].map((c) => {
            const active = category === c;
            return (
              <button
                key={c ?? "all"}
                onClick={() => setCategory(c)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition active:scale-95 ${
                  active ? "bg-slate-900 text-white shadow-card" : "bg-white/80 text-slate-600 hover:bg-white"
                }`}
              >
                {c ?? "Todas"}
              </button>
            );
          })}
        </div>

        <div className="grid flex-1 content-start grid-cols-2 gap-4 overflow-y-auto -mx-2 -mt-2 px-2 pb-2 pt-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((p) => {
            const { icon: Icon, tile } = categoryStyle(p.category);
            const out = p.stock === 0;
            const low = !out && p.stock <= p.minStock;
            const inCart = cart.find((c) => c.productId === p.id)?.qty ?? 0;
            return (
              <button
                key={p.id}
                onClick={() => addToCart(p.id)}
                disabled={out}
                className={`card group relative flex flex-col p-4 text-left transition hover:-translate-y-0.5 hover:shadow-float active:scale-[0.98] ${
                  out ? "opacity-60" : ""
                } ${inCart > 0 ? "ring-2 ring-blue-500" : ""}`}
              >
                {inCart > 0 && (
                  <span className="absolute right-3 top-3 flex h-7 min-w-7 items-center justify-center rounded-full bg-blue-600 px-2 text-xs font-bold text-white shadow-glow">
                    {inCart}
                  </span>
                )}
                <span className={`icon-tile mb-3 h-14 w-14 bg-gradient-to-br text-white shadow-lg ${tile}`}>
                  <Icon size={28} />
                </span>
                <span className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug text-slate-900">{p.name}</span>
                <span className="mt-1 font-mono text-[10px] text-slate-400">{p.barcode}</span>
                <div className="mt-3 flex items-end justify-between">
                  <span className="text-xl font-extrabold tracking-tight text-slate-900">{formatMoney(p.price)}</span>
                  <span className={`chip ${out ? "chip-bad" : low ? "chip-warn" : "chip-ok"}`}>
                    {out ? "Sin stock" : `${p.stock} u.`}
                  </span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && <p className="col-span-full py-16 text-center text-slate-500">No hay productos que coincidan.</p>}
        </div>
      </div>

      <aside className="card flex min-w-80 flex-[3] flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 pb-3 pt-5">
          <div className="flex items-center gap-3">
            <span className="icon-tile h-10 w-10 bg-gradient-to-br from-blue-600 to-sky-400 text-white shadow-glow">
              <ReceiptText size={20} />
            </span>
            <div>
              <h2 className="section-title leading-tight">Ticket actual</h2>
              <p className="text-xs text-slate-500">{units === 0 ? "Sin productos" : `${units} unidad${units === 1 ? "" : "es"}`}</p>
            </div>
          </div>
          {lines.length > 0 && (
            <button onClick={() => lines.forEach((l) => removeFromCart(l.product.id))} className="text-xs font-semibold text-slate-400 hover:text-red-500">
              Vaciar
            </button>
          )}
        </div>

        <ul className="flex-1 space-y-2 overflow-y-auto px-4 pb-3">
          {lines.length === 0 && (
            <li className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="icon-tile h-16 w-16 bg-slate-100 text-slate-400"><ScanBarcode size={30} /></span>
              <p className="text-sm font-semibold text-slate-600">Todavía no hay productos</p>
              <p className="max-w-48 text-xs text-slate-400">Escaneá un código o tocá un producto para empezar la venta.</p>
            </li>
          )}
          {lines.map(({ product, qty }) => {
            const { icon: Icon, tile } = categoryStyle(product.category);
            return (
              <li key={product.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                <span className={`icon-tile h-10 w-10 shrink-0 bg-gradient-to-br text-white ${tile}`}><Icon size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{product.name}</p>
                  <p className="text-xs text-slate-400">{formatMoney(product.price)} c/u</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <button onClick={() => changeQty(product.id, -1)} className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm hover:bg-slate-100">
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{qty}</span>
                    <button onClick={() => changeQty(product.id, 1)} className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm hover:bg-slate-100">
                      <Plus size={12} />
                    </button>                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold text-slate-900">{formatMoney(product.price * qty)}</span>
                  <button onClick={() => removeFromCart(product.id)} className="text-slate-300 hover:text-red-500" aria-label="Quitar">
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="space-y-1.5 border-t border-slate-100 bg-white/60 px-6 pb-6 pt-4">
          <div className="flex justify-between text-sm text-slate-500"><span>Subtotal (neto)</span><span>{formatMoney(net)}</span></div>
          <div className="flex justify-between text-sm text-slate-500"><span>IVA 21% incluido</span><span>{formatMoney(iva)}</span></div>
          <div className="flex items-end justify-between pt-2">
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">Total</span>
            <span className="text-4xl font-extrabold tracking-tight text-slate-900">{formatMoney(total)}</span>
          </div>
          <button onClick={() => setPayOpen(true)} disabled={!canCharge} className="btn btn-primary mt-3 w-full py-4 text-base">
            Cobrar <kbd className="rounded-md bg-white/25 px-1.5 py-0.5 text-xs">F9</kbd>
          </button>
          {lines.length > 0 && !cashOpen && <p className="text-center text-xs font-semibold text-amber-600">Abrí la caja para cobrar.</p>}
        </div>
      </aside>

      {payOpen && <PaymentModal total={total} onConfirm={handlePay} onClose={() => setPayOpen(false)} />}
      {newProduct && !newProduct.authorized && (
        <OwnerPinModal
          action={`Cargar el producto con código ${newProduct.code}`}
          onClose={closeNewProduct}
          onAuthorized={() => setNewProduct({ ...newProduct, authorized: true })}
        />
      )}
      {newProduct?.authorized && (
        <Modal title="Producto nuevo" subtitle={`El código ${newProduct.code} no está cargado. Completá los datos y se agrega al ticket.`} onClose={closeNewProduct}>
          <ProductForm
            product={null}
            initial={{ barcode: newProduct.code, stock: 1 }}
            onClose={closeNewProduct}
            onDone={(_, id) => onProductCreated(id)}
          />
        </Modal>
      )}
      {invoiceOf && <InvoiceModal saleId={invoiceOf} kind="factura" onClose={() => { setInvoiceOf(null); searchRef.current?.focus(); }} />}
      {toast && (
        <Toast
          title={toast.title}
          detail={toast.detail}
          action={toast.invoiceOf ? { label: "Ver factura", onClick: () => setInvoiceOf(toast.invoiceOf!) } : undefined}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}
