import type { CashState, Customer, CustomerMovement, FiscalSettings, PayMethod, Product, Sale, User } from "../types";
import { sameDay } from "../lib/format";
import { CONSUMIDOR_FINAL, MONOTRIBUTO_LIMITS, issue } from "../lib/invoice";

// PINs a la vista en la pantalla de ingreso: es una demo.
export const USERS: User[] = [
  { id: "u1", name: "Roberto Díaz", role: "admin", pin: "1234" },
  { id: "u2", name: "Juan Sosa", role: "cajero", pin: "1111" },
];

// Datos fiscales de ejemplo (CUIT inventado, con dígito verificador válido).
export const FISCAL: FiscalSettings = {
  businessName: "Kiosco Nubix",
  cuit: "20284567898",
  address: "Av. Colón 1234, Córdoba",
  startDate: "2019-03-01",
  condition: "monotributo",
  category: "K",
  annualLimit: MONOTRIBUTO_LIMITS["K"],
  pos: 3,
  autoInvoice: true,
};

export const CATEGORIES = [
  "Cigarrillos",
  "Bebidas",
  "Golosinas",
  "Snacks",
  "Galletitas",
  "Librería",
  "Varios",
];

// [nombre, categoría, costo, precio final, stock, mínimo] — los más vendidos van primero.
const RAW: [string, string, number, number, number, number][] = [
  ["Marlboro Box 20", "Cigarrillos", 3300, 3900, 40, 15],
  ["Philip Morris Box 20", "Cigarrillos", 2900, 3400, 36, 15],
  ["Camel Box 20", "Cigarrillos", 3200, 3800, 12, 15],
  ["Lucky Strike Box 20", "Cigarrillos", 3000, 3500, 25, 10],
  ["Coca-Cola 500ml", "Bebidas", 1300, 1900, 48, 24],
  ["Coca-Cola 2.25L", "Bebidas", 3000, 4200, 18, 8],
  ["Sprite 500ml", "Bebidas", 1250, 1850, 30, 12],
  ["Agua Villavicencio 500ml", "Bebidas", 700, 1200, 60, 24],
  ["Gatorade Naranja 500ml", "Bebidas", 1500, 2300, 20, 10],
  ["Cerveza Quilmes Lata 473ml", "Bebidas", 1300, 1900, 36, 24],
  ["Speed Energizante 250ml", "Bebidas", 1000, 1600, 6, 12],
  ["Fernet Branca 750ml", "Bebidas", 12000, 16500, 9, 4],
  ["Alfajor Jorgito Chocolate", "Golosinas", 750, 1200, 50, 20],
  ["Alfajor Guaymallén", "Golosinas", 350, 600, 80, 30],
  ["Chicles Beldent Menta", "Golosinas", 700, 1100, 45, 15],
  ["Sugus Paquete", "Golosinas", 900, 1500, 3, 10],
  ["Bon o Bon Unidad", "Golosinas", 300, 500, 100, 40],
  ["Chupetín Pico Dulce", "Golosinas", 200, 400, 90, 30],
  ["Mantecol 100g", "Golosinas", 1800, 2800, 14, 6],
  ["Chocolate Milka 55g", "Golosinas", 1500, 2400, 22, 8],
  ["Papas Lays Clásicas 85g", "Snacks", 1500, 2400, 24, 10],
  ["Doritos Queso 85g", "Snacks", 1600, 2500, 16, 10],
  ["Cheetos 60g", "Snacks", 1100, 1800, 0, 8],
  ["Maní Salado 100g", "Snacks", 800, 1400, 30, 10],
  ["Galletitas Oreo 117g", "Galletitas", 1100, 1800, 28, 10],
  ["Criollitas Pack x3", "Galletitas", 1300, 2000, 15, 8],
  ["Lapicera Bic Azul", "Librería", 400, 800, 40, 15],
  ["Pilas AA x2", "Librería", 1200, 2200, 17, 6],
  ["Encendedor Bic", "Varios", 900, 1600, 55, 20],
  ["Pañuelos Descartables", "Varios", 500, 900, 4, 12],
];

export function buildProducts(): Product[] {
  return RAW.map(([name, category, cost, price, stock, minStock], i) => ({
    id: `p${i + 1}`,
    barcode: `77900${String(i + 1).padStart(8, "0")}`,
    name,
    category,
    cost,
    price,
    stock,
    minStock,
  }));
}

const minutes = (n: number) => n * 60000;

function daysAgo(n: number, hour: number, min = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, min, 0, 0);
  return d;
}

// Ventas de los últimos 30 días (pseudo-aleatorias pero deterministas).
const DAYS = 30;
// Ventas típicas según el día de la semana (0 = domingo): el viernes y el sábado son los fuertes.
const BY_WEEKDAY = [50, 34, 36, 38, 40, 48, 58];
// Peso de cada hora de apertura (8 a 21 hs): picos al mediodía y a la tarde.
const HOUR_WEIGHTS = [3, 5, 4, 4, 6, 7, 5, 5, 6, 8, 10, 9, 6, 3];

// Productos que no se venden hace más de 10 días (para mostrar el reporte de stock parado).
const STALE = new Set(["p12", "p19", "p28"]);

// De lunes a sábado atiende Juan; los domingos atiende el dueño. Hoy el turno abierto es de Juan.
function whoAttended(date: Date, ago: number) {
  return ago > 0 && date.getDay() === 0 ? "u1" : "u2";
}

function buildSales(products: Product[]): Sale[] {
  let seed = 42;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const pickPayment = (): PayMethod => {
    const r = rnd();
    return r < 0.5 ? "efectivo" : r < 0.72 ? "mercadopago" : r < 0.88 ? "debito" : "transferencia";
  };
  const totalWeight = HOUR_WEIGHTS.reduce((a, b) => a + b, 0);
  const pickHour = () => {
    let r = rnd() * totalWeight;
    for (let h = 0; h < HOUR_WEIGHTS.length; h++) {
      r -= HOUR_WEIGHTS[h];
      if (r < 0) return 8 + h;
    }
    return 21;
  };

  const now = new Date();
  const todayCount = Math.min(22, Math.floor((now.getHours() * 60 + now.getMinutes()) / 15));

  const sales: Sale[] = [];
  for (let ago = DAYS - 1; ago >= 0; ago--) {
    const day = daysAgo(ago, 12);
    // Leve tendencia de crecimiento a lo largo del mes.
    const growth = 0.88 + 0.12 * (1 - ago / DAYS);
    const count = ago === 0 ? todayCount : Math.round(BY_WEEKDAY[day.getDay()] * growth * (0.9 + rnd() * 0.2));
    for (let k = 0; k < count; k++) {
      const date =
        ago === 0
          ? new Date(now.getTime() - minutes((k + 1) * 14))
          : daysAgo(ago, pickHour(), Math.floor(rnd() * 60));
      const lines = 1 + (rnd() < 0.35 ? 1 : 0) + (rnd() < 0.1 ? 1 : 0);
      const items = Array.from({ length: lines }, () => {
        let p: Product;
        do p = products[Math.floor(Math.pow(rnd(), 1.6) * products.length)];
        while (ago < 10 && STALE.has(p.id));
        return { productId: p.id, name: p.name, qty: rnd() < 0.7 ? 1 : 2, price: p.price, cost: p.cost };
      });
      sales.push({
        id: "",
        date: date.toISOString(),
        items,
        total: items.reduce((s, it) => s + it.qty * it.price, 0),
        payment: pickPayment(),
        userId: whoAttended(date, ago),
      });
    }
  }

  sales.sort((a, b) => a.date.localeCompare(b.date));
  const numbered = sales.map((s, i) => ({ ...s, id: `V-${String(i + 1).padStart(4, "0")}` }));

  // Un par de ventas anuladas de días anteriores, para mostrar cómo se ven.
  const old = numbered.filter((s) => new Date(s.date) < daysAgo(3, 0));
  [old.length - 12, old.length - 55].forEach((idx, n) => {
    const s = numbered[numbered.findIndex((x) => x.id === old[idx].id)];
    s.voidedAt = new Date(new Date(s.date).getTime() + minutes(8)).toISOString();
    s.voidReason = n === 0 ? "Error al cargar el producto" : "El cliente se arrepintió";
    s.voidedBy = "u1";
  });
  return withInvoices(numbered);
}

// Cada venta de ejemplo tiene su Factura C (el kiosco ya venía facturando: la numeración no arranca en 1),
// y las anuladas su nota de crédito.
function withInvoices(sales: Sale[]): Sale[] {
  let seed = 7;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  let number = 4820;
  let ncNumber = 11;
  return sales.map((s) => {
    const sale: Sale = { ...s, invoice: { ...issue([], FISCAL, "factura", "C", CONSUMIDOR_FINAL, s.date, rnd), number: ++number } };
    if (s.voidedAt) sale.creditNote = { ...issue([], FISCAL, "nc", "C", CONSUMIDOR_FINAL, s.voidedAt, rnd), number: ++ncNumber };
    return sale;
  });
}

function buildCustomers(): { customers: Customer[]; movements: CustomerMovement[] } {
  const defs: { id: string; name: string; phone: string; moves: [number, "compra" | "pago", number, PayMethod?][] }[] = [
    { id: "c1", name: "Doña Marta", phone: "3511234567", moves: [[9, "compra", 8400], [4, "pago", 5000, "efectivo"], [1, "compra", 9100]] },
    { id: "c2", name: "Carlos Gómez", phone: "3515550101", moves: [[6, "compra", 7300], [2, "pago", 3000, "transferencia"]] },
    { id: "c3", name: "Lucía Fernández", phone: "3519876543", moves: [[8, "compra", 4200], [5, "pago", 4200, "mercadopago"]] },
    { id: "c4", name: "Taller Don Raúl", phone: "3514445566", moves: [[12, "compra", 21000], [7, "compra", 14900], [3, "pago", 7000, "efectivo"]] },
    { id: "c5", name: "Julián Pérez", phone: "3512223344", moves: [[2, "compra", 7600]] },
  ];

  const movements: CustomerMovement[] = [];
  const customers = defs.map((d) => {
    let balance = 0;
    d.moves.forEach(([ago, type, amount, method], i) => {
      balance += type === "compra" ? amount : -amount;
      movements.push({
        id: `${d.id}-m${i}`,
        customerId: d.id,
        date: daysAgo(ago, 11 + i, 20).toISOString(),
        type,
        amount,
        method: type === "pago" ? method : "fiado",
        userId: "u2",
      });
    });
    return { id: d.id, name: d.name, phone: d.phone, balance };
  });
  return { customers, movements };
}

function buildCash(sales: Sale[]): CashState {
  const todays = sales.filter((s) => sameDay(new Date(s.date), new Date()));
  const openedAt = todays.length
    ? new Date(new Date(todays[0].date).getTime() - minutes(15))
    : new Date(Date.now() - minutes(1));

  return {
    current: {
      id: "C-0003",
      openedAt: openedAt.toISOString(),
      opening: 15000,
      openedBy: "u2",
      movements: [
        {
          id: "cm1",
          date: new Date(openedAt.getTime() + minutes(5)).toISOString(),
          type: "egreso",
          amount: 2500,
          note: "Compra de hielo",
          userId: "u2",
          authorizedBy: "u1",
        },
      ],
    },
    history: [
      { id: "C-0002", openedAt: daysAgo(1, 7, 45).toISOString(), closedAt: daysAgo(1, 21, 30).toISOString(), opening: 15000, expected: 68300, counted: 68300, collected: 134900, openedBy: "u2", closedBy: "u2" },
      { id: "C-0001", openedAt: daysAgo(2, 7, 50).toISOString(), closedAt: daysAgo(2, 21, 40).toISOString(), opening: 15000, expected: 72850, counted: 72350, collected: 141200, openedBy: "u2", closedBy: "u2" },
    ],
  };
}

export function createSeed() {
  const products = buildProducts();
  const sales = buildSales(products);
  const { customers, movements } = buildCustomers();
  return { users: USERS, products, sales, customers, customerMovements: movements, cash: buildCash(sales), fiscal: { ...FISCAL } };
}
