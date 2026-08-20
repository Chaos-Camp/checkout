import type { Cart } from "../cart.js";
import type { Money } from "../money.js";
import { total, type Coupon, type Region } from "../pricing.js";

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface ClientOptions {
  readonly baseUrl: string;
  readonly apiKey: string;
  /** Injected so tests and server-side renders can supply their own. */
  readonly fetch?: FetchLike;
}

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

  let response = await send();
  if (response.status === 409) {
    // 409 means a request with this idempotency key is still in flight
    // (usually a double-click). Ask once more; the server answers with the
    // original result once it settles.
    response = await send();
  }

  if (!response.ok) {
    throw new CheckoutApiError(response.status, `Order submission failed with ${response.status}`);
  }
  return (await response.json()) as OrderConfirmation;
}
