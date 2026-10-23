import { useState } from "react";
import type { InputHTMLAttributes } from "react";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  value: number;
  onChange: (value: number) => void;
}

// Campo numérico para valores guardados como número. Muestra lo que se escribe:
// si se borra queda vacío (en lugar de volver a 0) y no deja ceros adelante ("01500").
export default function NumberInput({ value, onChange, ...rest }: Props) {
  const [text, setText] = useState(String(value));
  // Si el valor cambia desde afuera (ej: otra categoría completa el tope), se muestra el nuevo.
  if (text === "" ? value !== 0 : Number(text) !== value) setText(String(value));

  return (
    <input
      {...rest}
      type="number"
      value={text}
      onChange={(e) => {
        const next = e.target.value.replace(/^0+(?=\d)/, "");
        setText(next);
        onChange(Number(next));
      }}
    />
  );
}
