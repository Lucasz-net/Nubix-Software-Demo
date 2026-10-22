import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Inventory from "./pages/Inventory";
import Cash from "./pages/Cash";
import Customers from "./pages/Customers";
import Restock from "./pages/Restock";
import Sales from "./pages/Sales";
import Invoices from "./pages/Invoices";
import Stats from "./pages/Stats";
import { useCurrentUser, useStore } from "./store/useStore";
import { HOME, canSee } from "./lib/roles";
import "./index.css";

const screens = {
  dashboard: Dashboard,
  pos: POS,
  inventory: Inventory,
  cash: Cash,
  customers: Customers,
  restock: Restock,
  sales: Sales,
  invoices: Invoices,
  stats: Stats,
};

export default function App() {
  const user = useCurrentUser();
  const requested = useStore((s) => s.screen);

  if (!user) return <Login />;

  // Si la pantalla no le corresponde al rol, se muestra su pantalla de inicio.
  const screen = canSee(user.role, requested) ? requested : HOME[user.role];
  const Screen = screens[screen];

  return (
    <div className="flex h-screen gap-2 p-3">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main key={screen} className="min-h-0 flex-1 animate-rise overflow-y-auto px-8 pb-8">
          <Screen />
        </main>
      </div>
    </div>
  );
}
