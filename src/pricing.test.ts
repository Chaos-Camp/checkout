import { describe, expect, it } from "vitest";
import { addItem, createCart } from "./cart.js";
import { money } from "./money.js";
import { taxRate, total, type Coupon } from "./pricing.js";

const cartOf = (cents: number) =>
  addItem(createCart("USD"), { sku: "SKU-1", name: "Item", unitPrice: money(cents, "USD") });

const tenOff: Coupon = { kind: "percent", code: "TIDE10", percent: 10 };
const fiveDollars: Coupon = { kind: "fixed", code: "WELCOME5", amount: money(500, "USD") };

describe("pricing", () => {
  describe("tax", () => {
    it("knows each region's rate", () => {
      expect(taxRate("US-CA")).toBe(0.0725);
      expect(taxRate("GB")).toBe(0.2);
    });

    it("adds tax to the subtotal", () => {
      const breakdown = total(cartOf(10_000), null, "US-CA");
      expect(breakdown.subtotal.amount).toBe(10_000);
      expect(breakdown.tax.amount).toBe(725);
      expect(breakdown.total.amount).toBe(10_725);
    });

    it("rounds tax to the nearest cent", () => {
      expect(total(cartOf(1999), null, "US-NY").tax.amount).toBe(80);
    });
  });

  describe("coupons", () => {
    it("takes a percentage off", () => {
      const breakdown = total(cartOf(10_000), tenOff, "US-NY");
      expect(breakdown.discount.amount).toBe(1000);
      expect(breakdown.total.amount).toBe(9400);
    });

    it("takes a fixed amount off", () => {
      const breakdown = total(cartOf(10_000), fiveDollars, "US-NY");
      expect(breakdown.discount.amount).toBe(500);
      expect(breakdown.total.amount).toBe(9900);
    });

    it("never discounts more than the subtotal", () => {
      const breakdown = total(cartOf(300), fiveDollars, "US-NY");
      expect(breakdown.discount.amount).toBe(300);
      expect(breakdown.total.amount).toBeGreaterThanOrEqual(0);
    });

    it("rejects a fixed coupon in another currency", () => {
      const euros: Coupon = { kind: "fixed", code: "EURO5", amount: money(500, "EUR") };
      expect(() => total(cartOf(10_000), euros, "US-NY")).toThrow(/EURO5 is in EUR/);
    });

    it("charges nothing for an empty cart", () => {
      const breakdown = total(createCart("USD"), fiveDollars, "US-CA");
      expect(breakdown.total.amount).toBe(0);
      expect(breakdown.discount.amount).toBe(0);
    });
  });
});
