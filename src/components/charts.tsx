import { useState } from "react";

// Gráficos SVG hechos a mano (sin librerías), con el estilo de la app.

export const compactMoney = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1).replace(".", ",")}M` : v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v)}`;

// Escala "linda" (1, 2, 2,5, 5 × 10^n) con 4 divisiones.
function niceStep(max: number) {
  const raw = Math.max(max, 1) / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}

export interface AreaPoint {
  label: string; // eje X
  title: string; // título del tooltip
  value: number;
  prev?: number; // período anterior (línea punteada)
}

export function AreaChart({ points, format }: { points: AreaPoint[]; format: (n: number) => string }) {
  const W = 760, H = 270, L = 56, R = 28, T = 16, B = 30;
  const [hover, setHover] = useState<number | null>(null);

  const n = points.length;
  const hasPrev = points.some((p) => (p.prev ?? 0) > 0);
  const step = niceStep(Math.max(...points.map((p) => Math.max(p.value, p.prev ?? 0))));
  const max = step * 4;
  const x = (i: number) => L + (n === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const slot = (W - L - R) / Math.max(n - 1, 1);

  const line = (vals: number[]) =>
    vals
      .map((v, i) => {
        if (i === 0) return `M${x(0)},${y(v)}`;
        const mx = (x(i - 1) + x(i)) / 2;
        return `C${mx},${y(vals[i - 1])} ${mx},${y(v)} ${x(i)},${y(v)}`;
      })
      .join(" ");

  const cur = points.map((p) => p.value);
  const every = Math.ceil(n / 8);
  const hp = hover === null ? null : points[hover];
  const tipW = 150, tipH = hasPrev ? 62 : 46;
  const tipX = hover === null ? 0 : Math.min(Math.max(x(hover) - tipW / 2, L), W - R - tipW);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setHover(null)} role="img" aria-label="Evolución de las ventas">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="areaLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
      </defs>

      {[0, 1, 2, 3, 4].map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t * step)} y2={y(t * step)} className="stroke-slate-200" strokeDasharray={t === 0 ? undefined : "3 5"} />
          <text x={L - 10} y={y(t * step) + 4} textAnchor="end" className="fill-slate-400" fontSize="12">{compactMoney(t * step)}</text>
        </g>
      ))}

      {hasPrev && <path d={line(points.map((p) => p.prev ?? 0))} fill="none" className="stroke-slate-300" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />}
      <path d={`${line(cur)} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="url(#areaFill)" />
      <path d={line(cur)} fill="none" stroke="url(#areaLine)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

      {points.map((p, i) => (i % every === 0 || i === n - 1) && (n - 1 - i >= every || i === n - 1) ? (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="fill-slate-500" fontSize="12">{p.label}</text>
      ) : null)}

      {hover !== null && hp && (
        <g pointerEvents="none">
          <line x1={x(hover)} x2={x(hover)} y1={T} y2={y(0)} className="stroke-blue-300" strokeDasharray="3 4" />
          <circle cx={x(hover)} cy={y(hp.value)} r="6" fill="#fff" stroke="#2563eb" strokeWidth="3" />
          <rect x={tipX} y={T} width={tipW} height={tipH} rx="12" className="fill-slate-900" opacity="0.95" />
          <text x={tipX + 12} y={T + 18} fontSize="11" className="fill-sky-200">{hp.title}</text>
          <text x={tipX + 12} y={T + 37} fontSize="16" fontWeight="700" className="fill-white">{format(hp.value)}</text>
          {hasPrev && <text x={tipX + 12} y={T + 54} fontSize="11" className="fill-slate-300">Antes: {format(hp.prev ?? 0)}</text>}
        </g>
      )}

      {points.map((_, i) => (
        <rect key={i} x={x(i) - slot / 2} y={T} width={slot} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(i)} />
      ))}
    </svg>
  );
}

export function BarChart({ items, format }: { items: { label: string; value: number }[]; format: (n: number) => string }) {
  const W = 520, H = 220, X = 6, T = 30, B = 26;
  const [hover, setHover] = useState<number | null>(null);
  const n = items.length;
  const max = Math.max(...items.map((i) => i.value), 1);
  const band = (W - X * 2) / n;
  const bw = Math.min(band * 0.62, 34);
  const top = items.findIndex((i) => i.value === max);
  const show = hover ?? top;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setHover(null)} role="img">
      <defs>
        <linearGradient id="barHot" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <line x1={X} x2={W - X} y1={H - B} y2={H - B} className="stroke-slate-200" />
      {items.map((it, i) => {
        const h = Math.max((it.value / max) * (H - T - B), it.value > 0 ? 3 : 0);
        const cx = X + band * i + band / 2;
        const active = i === show;
        return (
          <g key={i} onMouseEnter={() => setHover(i)}>
            <rect x={X + band * i} y={0} width={band} height={H} fill="transparent" />
            <rect
              x={cx - bw / 2}
              y={H - B - h}
              width={bw}
              height={h}
              rx="7"
              fill={active ? "url(#barHot)" : undefined}
              className={active ? undefined : "fill-slate-200"}
            />
            {active && it.value > 0 && (
              <text x={cx} y={H - B - h - 8} textAnchor="middle" fontSize="12" fontWeight="700" className="fill-blue-700">{format(it.value)}</text>
            )}
            <text x={cx} y={H - 7} textAnchor="middle" fontSize="12" className={active ? "fill-slate-900" : "fill-slate-500"} fontWeight={active ? 700 : 400}>{it.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function Donut({ slices, centerTop, centerBottom }: { slices: DonutSlice[]; centerTop: string; centerBottom: string }) {
  const r = 70, sw = 26, c = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.value, 0);
  let acc = 0;

  return (
    <svg viewBox="0 0 200 200" className="mx-auto w-52" role="img" aria-label="Medios de pago">
      <g transform="rotate(-90 100 100)">
        <circle cx="100" cy="100" r={r} fill="none" strokeWidth={sw} className="stroke-slate-100" />
        {total > 0 &&
          slices.filter((s) => s.value > 0).map((s) => {
            const len = (s.value / total) * c;
            const seg = (
              <circle
                key={s.label}
                cx="100"
                cy="100"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={sw}
                strokeDasharray={`${Math.max(len - 3, 1)} ${c - Math.max(len - 3, 1)}`}
                strokeDashoffset={-acc}
                strokeLinecap="butt"
              />
            );
            acc += len;
            return seg;
          })}
      </g>
      <text x="100" y="96" textAnchor="middle" fontSize="22" fontWeight="800" className="fill-slate-900">{centerTop}</text>
      <text x="100" y="116" textAnchor="middle" fontSize="11" className="fill-slate-500">{centerBottom}</text>
    </svg>
  );
}
