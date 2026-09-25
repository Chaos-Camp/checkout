import { isEmpty, subtotal, taxableSubtotal, type Cart } from "./cart.js";
import { add, min, multiply, subtract, zero, type Money } from "./money.js";

export type Region = "US-CA" | "US-NY" | "US-OR" | "CA-ON" | "GB" | "DE" | "JP";

/** Sales tax or VAT applied at checkout, as a fraction of the taxable amount. */
export const TAX_RATES: Readonly<Record<Region, number>> = {
  "US-CA": 0.0725,
  "US-NY": 0.04,
  "US-OR": 0, // Oregon has no sales tax
  "CA-ON": 0.13, // HST
  GB: 0.2,
  DE: 0.19,
  JP: 0.1, // consumption tax
};

export type Coupon =
  | { readonly kind: "percent"; readonly code: string; readonly percent: number }
  | { readonly kind: "fixed"; readonly code: string; readonly amount: Money };

export interface PriceBreakdown {
  readonly subtotal: Money;
  readonly discount: Money;
  readonly tax: Money;
  readonly total: Money;
}

export function taxRate(region: Region): number {
  return TAX_RATES[region];
}

/** How much a coupon takes off the given amount. Never more than the amount itself. */
export function discountFor(coupon: Coupon, base: Money): Money {
  switch (coupon.kind) {
    case "percent":
      return multiply(base, coupon.percent / 100);
    case "fixed":
      return min(coupon.amount, base);
  }
}

export function total(cart: Cart, coupon: Coupon | null, region: Region): PriceBreakdown {
  if (coupon?.kind === "fixed" && coupon.amount.currency !== cart.currency) {
    throw new TypeError(`Coupon ${coupon.code} is in ${coupon.amount.currency}, cart is in ${cart.currency}`);
  }

  const sub = subtotal(cart);
  if (isEmpty(cart)) {
    const none = zero(cart.currency);
    return { subtotal: sub, discount: none, tax: none, total: none };
  }

  const tax = multiply(taxableSubtotal(cart), taxRate(region));
  const discount = coupon ? discountFor(coupon, sub) : zero(cart.currency);
  return { subtotal: sub, discount, tax, total: subtract(add(sub, tax), discount) };
}
