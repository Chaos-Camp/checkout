import { describe, expect, it, vi } from "vitest";
import { addItem, createCart } from "../cart.js";
import { money } from "../money.js";
import { CheckoutApiError, submitOrder, type FetchLike, type OrderRequest } from "./client.js";

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

const options = (fetch: FetchLike) => ({ baseUrl: "https://api.tidepool.example", apiKey: "test-key", fetch });

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
