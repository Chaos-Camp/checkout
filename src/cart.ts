import { add, multiply, zero, type CurrencyCode, type Money } from "./money.js";

export interface LineItem {
  readonly sku: string;
  readonly name: string;
  readonly unitPrice: Money;
  readonly quantity: number;
}

/** Carts are immutable: every operation returns a new cart. */
export interface Cart {
  readonly currency: CurrencyCode;
  readonly items: readonly LineItem[];
}

export function createCart(currency: CurrencyCode): Cart {
  return { currency, items: [] };
}

export function addItem(cart: Cart, item: Omit<LineItem, "quantity">, quantity = 1): Cart {
  assertQuantity(quantity);
  if (item.unitPrice.currency !== cart.currency) {
    throw new TypeError(`Cannot add a ${item.unitPrice.currency} item to a ${cart.currency} cart`);
  }
  return { ...cart, items: [...cart.items, { ...item, quantity }] };
}

export function removeItem(cart: Cart, sku: string): Cart {
  return { ...cart, items: cart.items.filter((line) => line.sku !== sku) };
}

export function setQuantity(cart: Cart, sku: string, quantity: number): Cart {
  if (quantity === 0) {
    return removeItem(cart, sku);
  }
  assertQuantity(quantity);
  return {
    ...cart,
    items: cart.items.map((line) => (line.sku === sku ? { ...line, quantity } : line)),
  };
}

export function lineTotal(line: LineItem): Money {
  return multiply(line.unitPrice, line.quantity);
}

export function subtotal(cart: Cart): Money {
  return cart.items.reduce((sum, line) => add(sum, lineTotal(line)), zero(cart.currency));
}

export function isEmpty(cart: Cart): boolean {
  return cart.items.length === 0;
}

export function itemCount(cart: Cart): number {
  return cart.items.reduce((count, line) => count + line.quantity, 0);
}

function assertQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new RangeError(`Quantity must be a positive whole number, got ${quantity}`);
  }
}
