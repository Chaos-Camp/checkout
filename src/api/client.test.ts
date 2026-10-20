import { describe, expect, it, vi } from "vitest";
import { addItem, createCart } from "../cart.js";
import { money } from "../money.js";
import {
  CheckoutApiError,
  MAX_CONFLICT_RETRIES,
  submitOrder,
  type FetchLike,
  type OrderRequest,
} from "./client.js";

const order: OrderRequest = {
  cart: addItem(createCart("USD"), { sku: "MUG-01", name: "Tide mug", unitPrice: money(1800, "USD") }, 2),
  coupon: null,
  region: "US-NY",
  customerEmail: "shopper@example.com",
  idempotencyKey: "order-7f3a",
};

const confirmation = { orderId: "ord_123", status: "accepted", total: money(3744, "USD") };

const reply = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const noSleep = async (_ms: number) => {};

const options = (fetch: FetchLike, sleep: (ms: number) => Promise<void> = noSleep) => ({
  baseUrl: "https://api.tidepool.example",
  apiKey: "test-key",
  fetch,
  sleep,
});

describe("submitOrder", () => {
  describe("on success", () => {
    it("posts the order and returns the confirmation", async () => {
      const fetch = vi.fn<FetchLike>().mockResolvedValue(reply(201, confirmation));
      await expect(submitOrder(order, options(fetch))).resolves.toEqual(confirmation);

      const [url, init] = fetch.mock.calls[0]!;
      expect(url).toBe("https://api.tidepool.example/v1/orders");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toMatchObject({
        items: [{ sku: "MUG-01", quantity: 2 }],
        expectedTotal: { amount: 3744, currency: "USD" },
      });
    });

    it("sends the idempotency key and credentials", async () => {
      const fetch = vi.fn<FetchLike>().mockResolvedValue(reply(201, confirmation));
      await submitOrder(order, options(fetch));
      const headers = fetch.mock.calls[0]![1].headers as Record<string, string>;
      expect(headers["idempotency-key"]).toBe("order-7f3a");
      expect(headers.authorization).toBe("Bearer test-key");
    });
  });

  describe("on conflict", () => {
    it("retries when the idempotency key is in flight", async () => {
      const fetch = vi
        .fn<FetchLike>()
        .mockResolvedValueOnce(reply(409))
        .mockResolvedValueOnce(reply(201, confirmation));
      await expect(submitOrder(order, options(fetch))).resolves.toEqual(confirmation);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("keeps retrying until the key settles", async () => {
      const fetch = vi
        .fn<FetchLike>()
        .mockResolvedValueOnce(reply(409))
        .mockResolvedValueOnce(reply(409))
        .mockResolvedValueOnce(reply(201, confirmation));
      await expect(submitOrder(order, options(fetch))).resolves.toEqual(confirmation);
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it("backs off exponentially between retries", async () => {
      const fetch = vi.fn<FetchLike>().mockImplementation(async () => reply(409));
      const sleep = vi.fn(noSleep);
      await expect(submitOrder(order, options(fetch, sleep))).rejects.toMatchObject({ status: 409 });
      expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([100, 200, 400]);
    });

    it(`gives up after ${MAX_CONFLICT_RETRIES} retries`, async () => {
      const fetch = vi.fn<FetchLike>().mockImplementation(async () => reply(409));
      await expect(submitOrder(order, options(fetch))).rejects.toMatchObject({ status: 409 });
      expect(fetch).toHaveBeenCalledTimes(1 + MAX_CONFLICT_RETRIES);
    });
  });

  describe("on failure", () => {
    it("throws a CheckoutApiError with the status", async () => {
      const fetch = vi.fn<FetchLike>().mockResolvedValue(reply(422));
      await expect(submitOrder(order, options(fetch))).rejects.toMatchObject({
        name: "CheckoutApiError",
        status: 422,
      });
      await expect(submitOrder(order, options(fetch))).rejects.toBeInstanceOf(CheckoutApiError);
    });
  });
});
