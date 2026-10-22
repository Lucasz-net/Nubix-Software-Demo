import { useEffect, useRef, useState } from "react";
import { Delete } from "lucide-react";

const LENGTH = 4;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

interface Props {
  // Devuelve si el PIN es correcto; si no, el teclado se sacude y se limpia.
  onComplete: (pin: string) => boolean;
  dark?: boolean;
}

export default function PinPad({ onComplete, dark }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const complete = useRef(onComplete);
  complete.current = onComplete;

  useEffect(() => {
    if (pin.length < LENGTH) return;
    if (complete.current(pin)) return;
    setError(true);
    const t = setTimeout(() => { setPin(""); setError(false); }, 450);
    return () => clearTimeout(t);
  }, [pin]);

  const press = (key: string) => {
    if (error) return;
    if (key === "del") setPin((p) => p.slice(0, -1));
    else setPin((p) => (p.length < LENGTH ? p + key : p));
  };

  // También se puede tipear con el teclado físico o el numérico.
  const pressRef = useRef(press);
  pressRef.current = press;
  useEffect(() => {
    // Si había un campo con foco detrás (ej: el monto), los números no deben escribirse ahí.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const onKey = (e: KeyboardEvent) => {
      // preventDefault: al completar el PIN se abre la pantalla nueva y el último dígito
      // no debe terminar escrito en el campo que recibe el foco (ej: el buscador del POS).
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        pressRef.current(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        pressRef.current("del");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const key = dark
    ? "bg-white/8 text-white ring-1 ring-white/10 hover:bg-white/15"
    : "bg-slate-100 text-slate-900 hover:bg-slate-200";

  return (
    <div className="flex flex-col items-center">
      <div className={`mb-2 flex gap-4 ${error ? "animate-shake" : ""}`}>
        {Array.from({ length: LENGTH }, (_, i) => (
          <span
            key={i}
            className={`h-4 w-4 rounded-full transition ${
              error
                ? "bg-red-500"
                : i < pin.length
                  ? "scale-110 bg-gradient-to-br from-blue-500 to-teal-400"
                  : dark ? "bg-white/15" : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <p className={`mb-4 h-5 text-sm font-semibold ${error ? "text-red-500" : "text-transparent"}`}>PIN incorrecto</p>
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => press(k)}
              aria-label={k === "del" ? "Borrar" : k}
              className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl font-semibold transition active:scale-90 ${
                k === "del" ? (dark ? "text-slate-300 hover:bg-white/8" : "text-slate-500 hover:bg-slate-100") : key
              }`}
            >
              {k === "del" ? <Delete size={22} /> : k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
