# @tidepool/checkout

Cart, pricing, formatting and order submission for Tidepool's web checkout.

Part of the Tidepool demo for diff social. Tidepool is a fictional payments
company; this library is small on purpose so its pull requests read well.

## What's in it

| Module | Does |
| --- | --- |
| `money` | Integer minor-unit amounts with currency-checked arithmetic |
| `cart` | Immutable cart: add, remove, change quantities, subtotal |
| `pricing` | Coupons (percent or fixed) and regional tax, via `total()` |
| `format` | Locale-aware display with `Intl.NumberFormat` |
| `api/client` | `submitOrder()` against the orders API, with an idempotency key |

## Example

```ts
import { addItem, createCart, formatMoney, money, submitOrder, total } from "@tidepool/checkout";

let cart = createCart("USD");
cart = addItem(cart, { sku: "MUG-01", name: "Tide mug", unitPrice: money(1800, "USD") }, 2);

const coupon = { kind: "percent", code: "TIDE10", percent: 10 } as const;
const price = total(cart, coupon, "US-CA");
console.log(formatMoney(price.total)); // "$35.01"

const confirmation = await submitOrder(
  { cart, coupon, region: "US-CA", customerEmail: "shopper@example.com", idempotencyKey: crypto.randomUUID() },
  { baseUrl: "https://api.tidepool.example", apiKey: process.env.TIDEPOOL_KEY! },
);
```

Amounts are always integer minor units: `money(1800, "USD")` is $18.00.

## Development

```sh
npm ci
npm test            # vitest
npm run typecheck   # tsc --noEmit
npm run mutate      # stryker, whole suite (CI runs it on changed files only)
```

## License

MIT
