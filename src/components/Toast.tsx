import { useEffect, useRef } from "react";
import { Check } from "lucide-react";

interface Props {
  title: string;
  detail?: string;
  action?: { label: string; onClick: () => void };
  onDone: () => void;
}

export default function Toast({ title, detail, action, onDone }: Props) {
  const done = useRef(onDone);
  done.current = onDone;

  // Con un botón se deja más tiempo para tocarlo.
  const hasAction = !!action;
  useEffect(() => {
    const t = setTimeout(() => done.current(), hasAction ? 8000 : 4500);
    return () => clearTimeout(t);
  }, [title, detail, hasAction]);

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex animate-pop items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/95 py-3 pl-3 pr-6 text-white shadow-float backdrop-blur-xl">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-sky-400 text-slate-900">
        <Check size={18} strokeWidth={3} />
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {detail && <p className="text-sm text-sky-200">{detail}</p>}
      </div>
      {action && (
        <button
          onClick={() => {
            action.onClick();
            done.current();
          }}
          className="-mr-2 ml-2 rounded-full bg-white/12 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/20"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
