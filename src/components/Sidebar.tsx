import { useEffect, useState } from "react";
import { LogOut, PanelLeftClose, PanelLeftOpen, RotateCcw } from "lucide-react";
import { useCurrentUser, useStore } from "../store/useStore";
import Avatar from "./Avatar";
import { NAV_GROUPS, SCREEN_META } from "../lib/screens";
import { ROLE_LABEL, canSee } from "../lib/roles";

// Preferencia de la barra contraída: es de UI, va aparte de los datos del negocio.
const COLLAPSED_KEY = "nubix-sidebar-collapsed";

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export default function Sidebar() {
  const screen = useStore((s) => s.screen);
  const setScreen = useStore((s) => s.setScreen);
  const resetDemo = useStore((s) => s.resetDemo);
  const logout = useStore((s) => s.logout);
  const user = useCurrentUser();
  const lowCount = useStore((s) => s.products.filter((p) => p.stock <= p.minStock).length);
  const debtors = useStore((s) => s.customers.filter((c) => c.balance > 0).length);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, c ? "0" : "1");
      } catch {
        // sin almacenamiento disponible: la preferencia dura hasta cerrar la app
      }
      return !c;
    });

  // Ctrl+B contrae o expande la barra, como en los editores.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Cada rol ve solo sus pantallas; los grupos que quedan vacíos no se muestran.
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((id) => user && canSee(user.role, id)) })).filter(
    (g) => g.items.length > 0,
  );

  const reset = () => {
    if (window.confirm("¿Reiniciar la demo? Se restauran todos los datos de ejemplo.")) {
      resetDemo();
      setScreen("dashboard");
    }
  };

  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const toggleButton = (
    <button
      onClick={toggle}
      title={`${collapsed ? "Mostrar" : "Esconder"} el menú (Ctrl+B)`}
      aria-label={collapsed ? "Mostrar el menú" : "Esconder el menú"}
      aria-expanded={!collapsed}
      className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
    >
      <ToggleIcon size={18} />
    </button>
  );

  return (
    <aside
      className={`relative flex shrink-0 flex-col overflow-hidden rounded-[2rem] bg-gradient-to-b from-slate-900 via-[#0d2447] to-[#0f3a6b] p-4 text-slate-300 shadow-float transition-[width] duration-300 ease-out ${
        collapsed ? "w-[5.5rem]" : "w-72"
      }`}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-teal-400/15 blur-3xl" />

      {collapsed ? (
        <div className="relative flex flex-col items-center gap-3 pb-4 pt-3 short:gap-2 short:pb-2 short:pt-1">
          <img src="/logonubix.png" alt="Nubix" className="h-11 w-11 rounded-2xl shadow-lg ring-1 ring-white/20" />
          {toggleButton}
        </div>
      ) : (
        <div className="relative flex items-center gap-3 px-3 pb-6 pt-3 short:pb-3 short:pt-1">
          <img src="/logonubix.png" alt="Nubix" className="h-11 w-11 shrink-0 rounded-2xl shadow-lg ring-1 ring-white/20" />
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold leading-none tracking-tight text-white">Nubix</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-sky-300/80">Software</p>
          </div>
          {toggleButton}
        </div>
      )}

      <nav className={`relative flex-1 overflow-y-auto overflow-x-hidden ${collapsed ? "space-y-3 short:space-y-2" : "space-y-5 short:space-y-3"}`}>
        {groups.map((g, i) => (
          <div key={g.title ?? "main"}>
            {g.title && !collapsed && (
              <p className="mb-2 whitespace-nowrap px-3 short:mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400/80">{g.title}</p>
            )}
            {collapsed && i > 0 && <div className="mx-3 mb-3 h-px bg-white/10" />}
            <div className="space-y-1">
              {g.items.map((id) => {
                const { label, icon: Icon } = SCREEN_META[id];
                const active = screen === id;
                const badge = id === "restock" ? lowCount : id === "customers" ? debtors : 0;
                const badgeTone = id === "restock" ? "bg-amber-400 text-slate-900" : "bg-sky-400/90 text-slate-900";
                return (
                  <button
                    key={id}
                    onClick={() => setScreen(id)}
                    title={collapsed ? label : undefined}
                    aria-label={collapsed ? label : undefined}
                    className={`group flex w-full items-center gap-3 rounded-2xl p-2 text-sm font-semibold transition short:p-1.5 ${collapsed ? "" : "pr-3"} ${
                      active ? "bg-white/12 text-white ring-1 ring-white/10" : "text-slate-300 hover:bg-white/6 hover:text-white"
                    }`}
                  >
                    <span
                      className={`icon-tile relative h-9 w-9 transition short:h-8 short:w-8 ${
                        active
                          ? "bg-gradient-to-br from-blue-500 to-teal-400 text-white shadow-glow"
                          : "bg-white/8 text-slate-300 group-hover:text-white"
                      }`}
                    >
                      <Icon size={18} />
                      {collapsed && badge > 0 && (
                        <span className={`absolute -right-1.5 -top-1.5 min-w-[1.125rem] rounded-full px-1 text-[10px] font-bold leading-[1.125rem] ring-2 ring-slate-900 ${badgeTone}`}>
                          {badge}
                        </span>
                      )}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 whitespace-nowrap text-left">{label}</span>
                        {badge > 0 && <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${badgeTone}`}>{badge}</span>}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="relative mt-4 space-y-1 border-t border-white/10 pt-3 short:mt-2 short:pt-2">
        {user &&
          (collapsed ? (
            <div className="mb-1 flex flex-col items-center gap-1">
              <span title={`${user.name} · ${ROLE_LABEL[user.role]}`}>
                <Avatar user={user} size="h-10 w-10 text-sm" />
              </span>
              <button
                onClick={logout}
                title="Cambiar de usuario"
                aria-label="Cambiar de usuario"
                className="rounded-full p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="mb-2 flex items-center gap-3 rounded-2xl bg-white/8 p-2.5 short:mb-1 short:p-2 ring-1 ring-white/10">
              <Avatar user={user} size="h-10 w-10 text-sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-sky-300/80">{ROLE_LABEL[user.role]}</p>
              </div>
              <button
                onClick={logout}
                title="Cambiar de usuario"
                aria-label="Cambiar de usuario"
                className="rounded-full p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <LogOut size={18} />
              </button>
            </div>
          ))}
        {user?.role === "admin" && (
          <button
            onClick={reset}
            title={collapsed ? "Reiniciar datos de la demo" : undefined}
            aria-label={collapsed ? "Reiniciar datos de la demo" : undefined}
            className={`flex w-full items-center gap-2 whitespace-nowrap rounded-xl py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/8 hover:text-white ${
              collapsed ? "justify-center px-0" : "px-3"
            }`}
          >
            <RotateCcw size={14} /> {!collapsed && "Reiniciar datos de la demo"}
          </button>
        )}
        {!collapsed && <p className="whitespace-nowrap px-3 text-[11px] text-slate-500">Nubix Software · Demo v0.5</p>}
      </div>
    </aside>
  );
}
