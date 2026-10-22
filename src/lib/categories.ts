import { Candy, Cigarette, Cookie, CupSoda, Package, PenLine, Popcorn } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Cada categoría tiene su ícono y su degradé, siempre dentro de la paleta azul / celeste / agua.
export const CATEGORY_STYLE: Record<string, { icon: LucideIcon; tile: string }> = {
  Cigarrillos: { icon: Cigarette, tile: "from-slate-700 to-slate-900" },
  Bebidas: { icon: CupSoda, tile: "from-sky-400 to-blue-600" },
  Golosinas: { icon: Candy, tile: "from-teal-300 to-teal-500" },
  Snacks: { icon: Popcorn, tile: "from-blue-500 to-indigo-600" },
  Galletitas: { icon: Cookie, tile: "from-cyan-400 to-blue-500" },
  Librería: { icon: PenLine, tile: "from-sky-300 to-sky-500" },
  Varios: { icon: Package, tile: "from-slate-400 to-slate-600" },
};

export const categoryStyle = (category: string) =>
  CATEGORY_STYLE[category] ?? { icon: Package, tile: "from-slate-400 to-slate-600" };
