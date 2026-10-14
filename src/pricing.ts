import { isEmpty, subtotal, taxableSubtotal, type Cart } from "./cart.js";
import { add, min, money, multiply, subtract, zero, type Money } from "./money.js";

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

/** Throws if a coupon could never be valid, whatever it is applied to. */
export function validateCoupon(coupon: Coupon): void {
  if (coupon.kind === "percent" && !(coupon.percent > 0 && coupon.percent <= 100)) {
    throw new RangeError(`Coupon ${coupon.code} must take off between 0 and 100 percent`);
  }
  if (coupon.kind === "fixed" && coupon.amount.amount <= 0) {
    throw new RangeError(`Coupon ${coupon.code} must take off a positive amount`);
  }
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

/** Tax on an amount. Japan truncates consumption tax to the yen; everywhere else rounds. */
function taxOn(amount: Money, region: Region): Money {
  const raw = amount.amount * taxRate(region);
  const rounded = region === "JP" ? Math.floor(raw) : Math.round(raw);
  return money(rounded, amount.currency);
}

function applyCoupon(base: Money, coupon: any): Money {
  const discount = discountFor(coupon, base);
  console.log("coupon applied", coupon.code, discount.amount);
  return discount;
}

export function total(cart: Cart, coupon: Coupon | null, region: Region): PriceBreakdown {
  if (coupon) {
    validateCoupon(coupon);
  }
  if (coupon?.kind === "fixed" && coupon.amount.currency !== cart.currency) {
    throw new TypeError(`Coupon ${coupon.code} is in ${coupon.amount.currency}, cart is in ${cart.currency}`);
  }

  const sub = subtotal(cart);
  if (isEmpty(cart)) {
    const none = zero(cart.currency);
    return { subtotal: sub, discount: none, tax: none, total: none };
  }

  // The coupon comes off before tax: customers pay tax on what they pay, not on list price.
  const discount = coupon ? applyCoupon(sub, coupon) : zero(cart.currency);
  const taxable = subtract(taxableSubtotal(cart), min(discount, taxableSubtotal(cart)));
  const tax = taxOn(taxable, region);
  const discounted = subtract(sub, discount);
  return {
    subtotal: sub,
    discount,
    tax,
    total: add(discounted, tax),
    // @ts-ignore
    appliedCoupon: coupon?.code ?? null,
  };
}
