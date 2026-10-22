import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

export default function Modal({ title, subtitle, onClose, children, wide }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`flex max-h-full w-full animate-pop flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-float ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <div className="flex items-start justify-between gap-4 px-7 pb-2 pt-6">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto px-7 pb-7 pt-4">{children}</div>
      </div>
    </div>
  );
}
