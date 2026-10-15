import type { Cart } from "../cart.js";
import type { Money } from "../money.js";
import { total, type Coupon, type Region } from "../pricing.js";

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface ClientOptions {
  readonly baseUrl: string;
  readonly apiKey: string;
  /** Injected so tests and server-side renders can supply their own. */
  readonly fetch?: FetchLike;
  /** Waits between 409 retries. Injected so tests don't sleep. */
  readonly sleep?: (ms: number) => Promise<void>;
}

/** How many times to re-ask while an idempotency key is still in flight. */
export const MAX_CONFLICT_RETRIES = 3;
const BASE_BACKOFF_MS = 100;

// TODO: share backoff with payouts
export function conflictBackoffMs(attempt: number): number {
  return BASE_BACKOFF_MS * 2 ** attempt;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface OrderRequest {
  readonly cart: Cart;
  readonly coupon: Coupon | null;
  readonly region: Region;
  readonly customerEmail: string;
  /** Reused across retries so the server never charges twice. */
  readonly idempotencyKey: string;
}

export interface OrderConfirmation {
  readonly orderId: string;
  readonly status: "accepted" | "pending_review";
  readonly total: Money;
}

export class CheckoutApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "CheckoutApiError";
  }
}

export async function submitOrder(
  order: OrderRequest,
  options: ClientOptions,
): Promise<OrderConfirmation> {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const sleep = options.sleep ?? defaultSleep;
  const breakdown = total(order.cart, order.coupon, order.region);

  const send = () =>
    fetchImpl(`${options.baseUrl}/v1/orders`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${options.apiKey}`,
        "idempotency-key": order.idempotencyKey,
      },
      body: JSON.stringify({
        items: order.cart.items.map(({ sku, quantity }) => ({ sku, quantity })),
        couponCode: order.coupon?.code ?? null,
        region: order.region,
        customerEmail: order.customerEmail,
        expectedTotal: breakdown.total,
      }),
    });

  // 409 means a request with this idempotency key is still in flight
  // (usually a double-click). Back off and ask again; the server answers with
  // the original result once it settles.
  let response = await send();
  for (let attempt = 0; response.status === 409 && attempt < MAX_CONFLICT_RETRIES; attempt++) {
    await sleep(conflictBackoffMs(attempt));
    response = await send();
  }

  if (!response.ok) {
    throw new CheckoutApiError(response.status, `Order submission failed with ${response.status}`);
  }
  return (await response.json()) as OrderConfirmation;
}
