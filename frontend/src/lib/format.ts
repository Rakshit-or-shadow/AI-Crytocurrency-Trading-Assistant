// Number formatting helpers shared by the app screens.
export const usd = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });

// Signed percent with the sign in the text: +2.4% / -1.1%
export const signedPercent = (fraction: number, digits = 1) =>
  `${fraction >= 0 ? "+" : "-"}${Math.abs(fraction * 100).toFixed(digits)}%`;

export const signedUsd = (value: number) =>
  `${value >= 0 ? "+" : "-"}${usd(Math.abs(value))}`;
