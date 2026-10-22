import { openUrl } from "@tauri-apps/plugin-opener";

// Abre WhatsApp con el mensaje escrito. Sin número, WhatsApp deja elegir el contacto.
export async function openWhatsApp(phone: string, text: string) {
  const url = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
  try {
    await openUrl(url);
  } catch {
    window.open(url, "_blank"); // fuera de Tauri (navegador)
  }
}
