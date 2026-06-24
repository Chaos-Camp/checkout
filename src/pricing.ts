import { subtotal, type Cart } from "./cart.js";
import { add, multiply, type Money } from "./money.js";

export type Region = "US-CA" | "US-NY" | "GB" | "DE";

/** Sales tax or VAT applied at checkout, as a fraction of the taxable amount. */
export const TAX_RATES: Readonly<Record<Region, number>> = {
  "US-CA": 0.0725,
  "US-NY": 0.04,
  GB: 0.2,
  DE: 0.19,
};

export interface PriceBreakdown {
  readonly subtotal: Money;
  readonly tax: Money;
  readonly total: Money;
}

export function taxRate(region: Region): number {
  return TAX_RATES[region];
}

export function total(cart: Cart, region: Region): PriceBreakdown {
  const sub = subtotal(cart);
  const tax = multiply(sub, taxRate(region));
  return { subtotal: sub, tax, total: add(sub, tax) };
}
