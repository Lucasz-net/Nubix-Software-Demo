export type Rounding = 0 | 10 | 50 | 100;

// percent puede ser negativo (baja de precios). rounding 0 = al peso.
export function newPrice(price: number, percent: number, rounding: Rounding) {
  const step = rounding || 1;
  return Math.max(0, Math.round((price * (1 + percent / 100)) / step) * step);
}
