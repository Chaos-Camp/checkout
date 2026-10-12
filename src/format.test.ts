import { describe, expect, it } from "vitest";
import { formatMoney, toMajorUnits } from "./format.js";
import { money } from "./money.js";

describe("formatMoney", () => {
  describe("en-US", () => {
    it("formats dollars and cents", () => {
      expect(formatMoney(money(1250, "USD"))).toBe("$12.50");
    });

    it("groups thousands", () => {
      expect(formatMoney(money(12_345_678, "USD"))).toBe("$123,456.78");
    });

    it("shows negative amounts for refunds", () => {
      expect(formatMoney(money(-500, "USD"))).toBe("-$5.00");
    });
  });

  describe("other locales", () => {
    it("uses the locale's separators", () => {
      expect(formatMoney(money(1250, "EUR"), "de-DE")).toBe("12,50 €");
    });

    it("formats pounds in en-GB", () => {
      expect(formatMoney(money(999, "GBP"), "en-GB")).toBe("£9.99");
    });
  });

  describe("zero-decimal currencies", () => {
    it("shows whole yen with no decimals", () => {
      expect(formatMoney(money(1500, "JPY"), "ja-JP")).toBe("￥1,500");
    });

    it("does not divide yen by 100", () => {
      expect(formatMoney(money(1500, "JPY"))).toBe("¥1,500");
      expect(formatMoney(money(1500, "JPY"))).not.toContain(".");
    });

    it("formats a single yen", () => {
      expect(formatMoney(money(1, "JPY"))).toBe("¥1");
    });

    it("keeps two decimals for dollars in the same locale", () => {
      expect(formatMoney(money(1500, "USD"), "ja-JP")).toBe("$15.00");
    });
  });

  describe("toMajorUnits", () => {
    it("scales by the currency's minor-unit digits", () => {
      expect(toMajorUnits(money(1250, "USD"))).toBe(12.5);
      expect(toMajorUnits(money(1250, "JPY"))).toBe(1250);
      expect(toMajorUnits(money(-5, "EUR"))).toBe(-0.05);
    });
  });
});
