import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useStore } from "../store/useStore";
import { CATEGORIES } from "../data/mock";
import { formatMoney, margin } from "../lib/format";
import type { Product } from "../types";

const emptyForm: Omit<Product, "id"> = {
  barcode: "",
  name: "",
  category: CATEGORIES[0],
  cost: 0,
  price: 0,
  stock: 0,
  minStock: 5,
};

interface Props {
  product: Product | null; // null = producto nuevo
  initial?: Partial<Omit<Product, "id">>; // valores precargados de un producto nuevo (ej: el código escaneado)
  onClose: () => void;
  onDone: (msg: string, productId: string) => void;
}

export default function ProductForm({ product, initial, onClose, onDone }: Props) {
  const { addProduct, updateProduct } = useStore.getState();
  const products = useStore((s) => s.products);
  const [form, setForm] = useState<Omit<Product, "id">>(product ?? { ...emptyForm, ...initial });

  // Dos productos con el mismo código harían que el lector siempre agregue el primero.
  const code = form.barcode.trim();
  const duplicate = code ? products.find((p) => p.barcode === code && p.id !== product?.id) : undefined;

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const num = (key: "cost" | "price" | "stock" | "minStock") => ({
    type: "number" as const,
    min: 0,
    required: true,
    value: form[key],
    onChange: (e: ChangeEvent<HTMLInputElement>) => set(key, Number(e.target.value)),
    className: "input",
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (duplicate) return;
    const data = { ...form, barcode: code, name: form.name.trim() };
    if (product) {
      updateProduct({ ...data, id: product.id });
      onDone("Producto actualizado", product.id);
    } else {
      onDone("Producto creado", addProduct(data));
    }
  };

  const m = margin(form.cost, form.price);

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-4">
      <label>
        <span className="field-label">Código de barras</span>
        <input
          required
          value={form.barcode}
          onChange={(e) => set("barcode", e.target.value)}
          className={`input ${duplicate ? "border-red-400 focus:border-red-400 focus:ring-red-200/60" : ""}`}
        />
      </label>
      <label>
        <span className="field-label">Categoría</span>
        <select value={form.category} onChange={(e) => set("category", e.target.value)} className="input">
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      {duplicate && (
        <p className="col-span-2 -mt-2 rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600">
          Ese código ya es de "{duplicate.name}". Cada producto necesita un código distinto.
        </p>
      )}
      <label className="col-span-2">
        <span className="field-label">Nombre del producto</span>
        <input required autoFocus={!!initial?.barcode} value={form.name} onChange={(e) => set("name", e.target.value)} className="input" />
      </label>
      <label><span className="field-label">Precio de costo ($)</span><input {...num("cost")} /></label>
      <label><span className="field-label">Precio de venta ($)</span><input {...num("price")} /></label>
      <div className="col-span-2 flex items-center justify-between rounded-2xl bg-gradient-to-r from-blue-50 to-teal-50 px-5 py-3 text-sm">
        <span className="text-slate-600">Ganancia por unidad <b className="ml-1 text-slate-900">{formatMoney(form.price - form.cost)}</b></span>
        <span className={`chip ${m < 15 ? "chip-warn" : "chip-ok"}`}>Margen {m.toFixed(0)}%</span>
      </div>
      <label><span className="field-label">Stock actual (unidades)</span><input {...num("stock")} /></label>
      <label><span className="field-label">Avisar cuando queden</span><input {...num("minStock")} /></label>
      <div className="col-span-2 mt-2 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
        <button disabled={!!duplicate} className="btn btn-primary">{product ? "Guardar cambios" : "Crear producto"}</button>
      </div>
    </form>
  );
}
