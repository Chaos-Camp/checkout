/**
 * Money is always held in integer minor units (cents, pence; yen have none) so that
 * arithmetic never drifts. Convert to and from major units only at the edges.
 */

export type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "JPY";

export interface Money {
  /** Integer amount in the currency's minor unit. */
  readonly amount: number;
  readonly currency: CurrencyCode;
}

const MINOR_UNIT_DIGITS: Record<CurrencyCode, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  CAD: 2,
  JPY: 0,
};

export function minorUnitDigits(currency: CurrencyCode): number {
  return MINOR_UNIT_DIGITS[currency];
}

export function money(amount: number, currency: CurrencyCode): Money {
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError(`Money amounts must be whole minor units, got ${amount}`);
  }
  return { amount, currency };
}

export function zero(currency: CurrencyCode): Money {
  return money(0, currency);
}

/** Build Money from a major-unit amount, e.g. fromMajor(12.5, "USD") is 1250 cents. */
export function fromMajor(major: number, currency: CurrencyCode): Money {
  const factor = 10 ** minorUnitDigits(currency);
  return money(Math.round(major * factor), currency);
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount + b.amount, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount - b.amount, a.currency);
}

/** Multiply by a factor (a quantity or a rate), rounding half away from zero. */
export function multiply(m: Money, factor: number): Money {
  return money(Math.round(m.amount * factor), m.currency);
}

export function min(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return a.amount <= b.amount ? a : b;
}

export function isZero(m: Money): boolean {
  return m.amount === 0;
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new TypeError(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}
