import { describe, expect, it } from "vitest";
import { add, fromMajor, isZero, min, money, multiply, subtract, zero } from "./money.js";

describe("money", () => {
  describe("construction", () => {
    it("accepts whole minor units", () => {
      expect(money(1250, "USD")).toEqual({ amount: 1250, currency: "USD" });
    });

    it("rejects fractional minor units", () => {
      expect(() => money(12.5, "USD")).toThrow(RangeError);
    });

    it("converts from major units", () => {
      expect(fromMajor(12.5, "USD").amount).toBe(1250);
      expect(fromMajor(0.1 + 0.2, "EUR").amount).toBe(30);
      expect(fromMajor(1500, "JPY").amount).toBe(1500);
    });

    it("has a zero for every currency", () => {
      expect(isZero(zero("GBP"))).toBe(true);
      expect(isZero(money(1, "GBP"))).toBe(false);
    });
  });

  describe("arithmetic", () => {
    it("adds and subtracts in the same currency", () => {
      expect(add(money(100, "USD"), money(250, "USD")).amount).toBe(350);
      expect(subtract(money(100, "USD"), money(250, "USD")).amount).toBe(-150);
    });

    it("refuses to mix currencies", () => {
      expect(() => add(money(100, "USD"), money(100, "EUR"))).toThrow(TypeError);
    });

    it("rounds when multiplying by a rate", () => {
      expect(multiply(money(999, "USD"), 0.0725).amount).toBe(72);
      expect(multiply(money(1000, "USD"), 0.0725).amount).toBe(73);
    });

    it("picks the smaller amount", () => {
      expect(min(money(5, "CAD"), money(3, "CAD")).amount).toBe(3);
    });
  });
});
