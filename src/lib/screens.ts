import { ChartColumn, ClipboardList, LayoutDashboard, Package, ReceiptText, ShoppingCart, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Screen } from "../types";

export const SCREEN_META: Record<Screen, { label: string; title: string; subtitle: string; icon: LucideIcon }> = {
  dashboard: { label: "Resumen", title: "Resumen del negocio", subtitle: "Cómo viene el día: ventas, ganancia, stock y deudas.", icon: LayoutDashboard },
  pos: { label: "Punto de Venta", title: "Punto de Venta", subtitle: "Escaneá o buscá productos y cobrá en segundos.", icon: ShoppingCart },
  cash: { label: "Caja", title: "Caja", subtitle: "Controlá la plata que entra y sale en tu turno.", icon: Wallet },
  inventory: { label: "Inventario", title: "Inventario", subtitle: "Productos, precios, márgenes y stock.", icon: Package },
  restock: { label: "Reposición", title: "Reposición de mercadería", subtitle: "Lo que se está acabando y el pedido para tu proveedor.", icon: ClipboardList },
  sales: { label: "Ventas", title: "Registro de ventas", subtitle: "Todas las ventas, con filtros, detalle y anulaciones.", icon: ReceiptText },
  stats: { label: "Estadísticas", title: "Estadísticas y reportes", subtitle: "Cómo vende tu negocio: días, horas y productos.", icon: ChartColumn },
  customers: { label: "Clientes y Fiado", title: "Clientes y Fiado", subtitle: "Quién te debe, cuánto, y los pagos que te hicieron.", icon: Users },
};

export const NAV_GROUPS: { title: string | null; items: Screen[] }[] = [
  { title: null, items: ["dashboard"] },
  { title: "Vender", items: ["pos", "cash"] },
  { title: "Administrar", items: ["sales", "stats", "inventory", "restock", "customers"] },
];
