import { useEffect, useRef } from "react";
import { Check } from "lucide-react";

interface Props {
  title: string;
  detail?: string;
  onDone: () => void;
}

export default function Toast({ title, detail, onDone }: Props) {
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const t = setTimeout(() => done.current(), 4500);
    return () => clearTimeout(t);
  }, [title, detail]);

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex animate-pop items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/95 py-3 pl-3 pr-6 text-white shadow-float backdrop-blur-xl">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-sky-400 text-slate-900">
        <Check size={18} strokeWidth={3} />
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {detail && <p className="text-sm text-sky-200">{detail}</p>}
      </div>
    </div>
  );
}
