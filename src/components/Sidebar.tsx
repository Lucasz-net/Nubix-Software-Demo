import { RotateCcw } from "lucide-react";
import { useStore } from "../store/useStore";
import { NAV_GROUPS, SCREEN_META } from "../lib/screens";

export default function Sidebar() {
  const screen = useStore((s) => s.screen);
  const setScreen = useStore((s) => s.setScreen);
  const resetDemo = useStore((s) => s.resetDemo);
  const lowCount = useStore((s) => s.products.filter((p) => p.stock <= p.minStock).length);
  const debtors = useStore((s) => s.customers.filter((c) => c.balance > 0).length);

  const reset = () => {
    if (window.confirm("¿Reiniciar la demo? Se restauran todos los datos de ejemplo.")) {
      resetDemo();
      setScreen("dashboard");
    }
  };

  return (
    <aside className="relative flex w-72 shrink-0 flex-col overflow-hidden rounded-[2rem] bg-gradient-to-b from-slate-900 via-[#0d2447] to-[#0f3a6b] p-4 text-slate-300 shadow-float">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-teal-400/15 blur-3xl" />

      <div className="relative flex items-center gap-3 px-3 pb-6 pt-3">
        <img src="/logonubix.png" alt="Nubix" className="h-11 w-11 rounded-2xl shadow-lg ring-1 ring-white/20" />
        <div>
          <p className="text-xl font-bold leading-none tracking-tight text-white">Nubix</p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-sky-300/80">Software</p>
        </div>
      </div>

      <nav className="relative flex-1 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map((g) => (
          <div key={g.title ?? "main"}>
            {g.title && (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400/80">{g.title}</p>
            )}
            <div className="space-y-1">
              {g.items.map((id) => {
                const { label, icon: Icon } = SCREEN_META[id];
                const active = screen === id;
                const badge = id === "restock" ? lowCount : id === "customers" ? debtors : 0;
                return (
                  <button
                    key={id}
                    onClick={() => setScreen(id)}
                    className={`group flex w-full items-center gap-3 rounded-2xl p-2 pr-3 text-sm font-semibold transition ${
                      active ? "bg-white/12 text-white ring-1 ring-white/10" : "text-slate-300 hover:bg-white/6 hover:text-white"
                    }`}
                  >
                    <span
                      className={`icon-tile h-9 w-9 transition ${
                        active
                          ? "bg-gradient-to-br from-blue-500 to-teal-400 text-white shadow-glow"
                          : "bg-white/8 text-slate-300 group-hover:text-white"
                      }`}
                    >
                      <Icon size={18} />
                    </span>
                    <span className="flex-1 text-left">{label}</span>
                    {badge > 0 && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${id === "restock" ? "bg-amber-400 text-slate-900" : "bg-sky-400/90 text-slate-900"}`}>
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="relative mt-4 space-y-1 border-t border-white/10 pt-3">
        <button
          onClick={reset}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/8 hover:text-white"
        >
          <RotateCcw size={14} /> Reiniciar datos de la demo
        </button>
        <p className="px-3 text-[11px] text-slate-500">Nubix Software · Demo v0.3</p>
      </div>
    </aside>
  );
}
