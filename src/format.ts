import type { Money } from "./money.js";

const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(locale: string, currency: string): Intl.NumberFormat {
  const key = `${locale}:${currency}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

/** Format Money for display, e.g. formatMoney(money(1250, "USD")) is "$12.50". */
export function formatMoney(value: Money, locale = "en-US"): string {
  return formatterFor(locale, value.currency).format(value.amount / 100);
}
