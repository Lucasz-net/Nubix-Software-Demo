import { useMemo } from "react";
import qrcode from "qrcode-generator";

export default function QrCode({ text, size = 112 }: { text: string; size?: number }) {
  const { n, path } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    let path = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += `M${c} ${r}h1v1h-1z`;
    return { n, path };
  }, [text]);

  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} width={size} height={size} shapeRendering="crispEdges" role="img" aria-label="Código QR del comprobante">
      <rect x={-2} y={-2} width={n + 4} height={n + 4} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}
