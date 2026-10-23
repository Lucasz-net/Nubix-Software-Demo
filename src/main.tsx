import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// La rueda del mouse sobre un campo numérico con el cursor adentro cambia el número sin avisar
// (un monto de $1500 pasa a $1499). Se le saca el foco para que la rueda solo desplace la pantalla.
document.addEventListener(
  "wheel",
  (e) => {
    const el = document.activeElement;
    if (el instanceof HTMLInputElement && el.type === "number" && el === e.target) el.blur();
  },
  { passive: true },
);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
