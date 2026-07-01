import { describe, expect, it } from "vitest";
import { formatMoney } from "./format.js";
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
});
