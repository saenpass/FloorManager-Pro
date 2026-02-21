export const money = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const pct = (n: number) => `${(Number.isFinite(n) ? n : 0).toFixed(2)}%`;