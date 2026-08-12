import { describe, expect, it } from "vitest";
import {
  MAX_QUANTITY,
  addItem,
  createCart,
  itemCount,
  removeItem,
  setQuantity,
  subtotal,
} from "./cart.js";
import { money } from "./money.js";

const mug = { sku: "MUG-01", name: "Tide mug", unitPrice: money(1800, "USD") };
const tote = { sku: "TOTE-02", name: "Canvas tote", unitPrice: money(2450, "USD") };

describe("cart", () => {
  describe("adding items", () => {
    it("starts empty", () => {
      const cart = createCart("USD");
      expect(cart.items).toHaveLength(0);
      expect(subtotal(cart).amount).toBe(0);
    });

    it("adds a line with a quantity", () => {
      const cart = addItem(createCart("USD"), mug, 2);
      expect(itemCount(cart)).toBe(2);
      expect(subtotal(cart).amount).toBe(3600);
    });

    it("merges a repeated sku into one line", () => {
      const cart = addItem(addItem(createCart("USD"), mug, 2), mug, 3);
      expect(cart.items).toHaveLength(1);
      expect(itemCount(cart)).toBe(5);
    });

    it("caps a line at MAX_QUANTITY", () => {
      expect(() => addItem(createCart("USD"), mug, MAX_QUANTITY)).not.toThrow();
      expect(() => addItem(createCart("USD"), mug, MAX_QUANTITY + 1)).toThrow(RangeError);
      expect(() => addItem(addItem(createCart("USD"), mug, 60), mug, 40)).toThrow(RangeError);
    });

    it("rejects items priced in another currency", () => {
      const euroMug = { ...mug, unitPrice: money(1700, "EUR") };
      expect(() => addItem(createCart("USD"), euroMug)).toThrow(TypeError);
    });

    it("rejects non-positive quantities", () => {
      expect(() => addItem(createCart("USD"), mug, 0)).toThrow(RangeError);
      expect(() => addItem(createCart("USD"), mug, 1.5)).toThrow(RangeError);
    });
  });

  describe("changing items", () => {
    it("updates a quantity", () => {
      const cart = setQuantity(addItem(createCart("USD"), mug), "MUG-01", 3);
      expect(itemCount(cart)).toBe(3);
    });

    it("removes a line when its quantity is set to zero", () => {
      const cart = setQuantity(addItem(createCart("USD"), mug), "MUG-01", 0);
      expect(cart.items).toHaveLength(0);
    });

    it("removes a line by sku", () => {
      let cart = addItem(createCart("USD"), mug);
      cart = addItem(cart, tote);
      cart = removeItem(cart, "MUG-01");
      expect(cart.items.map((line) => line.sku)).toEqual(["TOTE-02"]);
      expect(subtotal(cart).amount).toBe(2450);
    });
  });
});
