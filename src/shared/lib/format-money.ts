export function formatUsdMinor(amountMinor: number): string {
  const whole = Math.trunc(amountMinor / 100).toLocaleString("en-US");
  const cents = String(amountMinor % 100).padStart(2, "0");
  return `$${whole}${cents === "00" ? "" : `.${cents}`}`;
}
