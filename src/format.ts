import { minorUnitDigits, type CurrencyCode, type Money } from "./money.js";

const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(locale: string, currency: CurrencyCode): Intl.NumberFormat {
  const key = `${locale}:${currency}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    // Show exactly as many decimals as the currency has minor-unit digits:
    // two for dollars and euros, none for yen.
    const digits = minorUnitDigits(currency);
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

/** Convert integer minor units to the major-unit number Intl expects. */
export function toMajorUnits(value: Money): number {
  return value.amount / 10 ** minorUnitDigits(value.currency);
}

/**
 * Format Money for display, e.g. formatMoney(money(1250, "USD")) is "$12.50"
 * and formatMoney(money(1500, "JPY"), "ja-JP") is "￥1,500".
 */
export function formatMoney(value: Money, locale = "en-US"): string {
  return formatterFor(locale, value.currency).format(toMajorUnits(value));
}
