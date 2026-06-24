import { describe, expect, it } from "vitest";
import { addItem, createCart } from "./cart.js";
import { money } from "./money.js";
import { taxRate, total } from "./pricing.js";

const cartOf = (cents: number) =>
  addItem(createCart("USD"), { sku: "SKU-1", name: "Item", unitPrice: money(cents, "USD") });

describe("pricing", () => {
  describe("tax", () => {
    it("knows each region's rate", () => {
      expect(taxRate("US-CA")).toBe(0.0725);
      expect(taxRate("GB")).toBe(0.2);
    });

    it("adds tax to the subtotal", () => {
      const breakdown = total(cartOf(10_000), "US-CA");
      expect(breakdown.subtotal.amount).toBe(10_000);
      expect(breakdown.tax.amount).toBe(725);
      expect(breakdown.total.amount).toBe(10_725);
    });

    it("rounds tax to the nearest cent", () => {
      expect(total(cartOf(1999), "US-NY").tax.amount).toBe(80);
    });
  });
});
