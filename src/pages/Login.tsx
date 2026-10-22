import { useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useStore } from "../store/useStore";
import PinPad from "../components/PinPad";
import Avatar from "../components/Avatar";
import { ROLE_LABEL } from "../lib/roles";
import type { User } from "../types";

export default function Login() {
  const users = useStore((s) => s.users);
  const login = useStore((s) => s.login);
  const [selected, setSelected] = useState<User | null>(null);

  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-[#0d2447] to-[#0f3a6b] p-6 text-white">
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-teal-400/15 blur-3xl" />

      <div className="relative w-full max-w-3xl animate-rise">
        <div className="mb-10 flex flex-col items-center text-center">
          <img src="/logonubix.png" alt="Nubix" className="mb-4 h-16 w-16 rounded-3xl shadow-lg ring-1 ring-white/20" />
          <h1 className="text-3xl font-bold tracking-tight">{selected ? `Hola, ${selected.name.split(" ")[0]}` : "¿Quién atiende?"}</h1>
          <p className="mt-1 text-sm text-sky-200/80">
            {selected ? "Ingresá tu PIN de 4 dígitos." : "Elegí tu usuario para empezar el turno."}
          </p>
        </div>

        {!selected ? (
          <div className="mx-auto grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelected(u)}
                className="group flex flex-col items-center gap-3 rounded-[2rem] bg-white/8 p-6 ring-1 ring-white/10 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/12"
              >
                <Avatar user={u} />
                <div>
                  <p className="text-lg font-semibold">{u.name}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.15em] text-sky-300/90">
                    {u.role === "admin" && <ShieldCheck size={13} />} {ROLE_LABEL[u.role]}
                  </p>
                </div>
                <span className="rounded-full bg-white/8 px-3 py-1 text-[11px] text-slate-300">PIN demo: {u.pin}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mx-auto flex max-w-sm flex-col items-center rounded-[2rem] bg-white/8 p-8 ring-1 ring-white/10 backdrop-blur-xl">
            <Avatar user={selected} />
            <p className="mb-6 mt-3 text-xs font-semibold uppercase tracking-[0.15em] text-sky-300/90">{ROLE_LABEL[selected.role]}</p>
            <PinPad
              dark
              onComplete={(pin) => {
                if (pin !== selected.pin) return false;
                login(selected.id);
                return true;
              }}
            />
            <button
              onClick={() => setSelected(null)}
              className="mt-6 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/8 hover:text-white"
            >
              <ArrowLeft size={16} /> Cambiar de usuario
            </button>
          </div>
        )}

        <p className="mt-10 text-center text-[11px] text-slate-400">Nubix Software · Demo v0.5</p>
      </div>
    </div>
  );
}

