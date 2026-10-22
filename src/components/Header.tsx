import { CalendarDays } from "lucide-react";
import { useCurrentUser, useStore } from "../store/useStore";
import Avatar from "./Avatar";
import { ROLE_LABEL } from "../lib/roles";
import { SCREEN_META } from "../lib/screens";
import { formatTime } from "../lib/format";

export default function Header() {
  const screen = useStore((s) => s.screen);
  const setScreen = useStore((s) => s.setScreen);
  const session = useStore((s) => s.cash.current);
  const user = useCurrentUser();
  const meta = SCREEN_META[screen];
  const today = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <header className="flex shrink-0 items-center justify-between gap-6 px-8 pb-5 pt-7">
      <div className="min-w-0">
        <h1 className="truncate text-3xl font-bold tracking-tight text-slate-900">{meta.title}</h1>
        <p className="mt-0.5 truncate text-sm text-slate-500">{meta.subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          onClick={() => setScreen("cash")}
          title="Ir a Caja"
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-card transition hover:scale-[1.02] ${
            session ? "border-teal-200 bg-teal-50 text-teal-800" : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${session ? "animate-pulse bg-teal-500" : "bg-amber-500"}`} />
          {session ? `Caja abierta · desde ${formatTime(session.openedAt)}` : "Caja cerrada"}
        </button>
        <span className="hidden items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-card lg:flex">
          <CalendarDays size={16} className="text-blue-600" />
          <span className="first-letter:uppercase">{today}</span>
        </span>
        {user && (
          <span className="flex items-center gap-2 rounded-full bg-white/80 py-1.5 pl-1.5 pr-4 text-sm font-semibold text-slate-700 shadow-card">
            <Avatar user={user} size="h-8 w-8 text-xs" />
            {user.name.split(" ")[0]}
            <span className="font-medium text-slate-400">· {ROLE_LABEL[user.role]}</span>
          </span>
        )}
      </div>
    </header>
  );
}
