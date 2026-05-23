import { describe, it, expect } from "vitest";
import {
  calculateMaterialQuantity,
  calculateTotalCost,
  normalizeZipCode,
} from "./pricing";

describe("Pricing Service", () => {
  describe("calculateMaterialQuantity", () => {
    it("should calculate quantity for hotmix correctly", () => {
      const result = calculateMaterialQuantity(1000, 2, "hotmix");
      expect(result.unit).toBe("tons");
      expect(result.quantity).toBeGreaterThan(0);
      expect(result.quantityStr).toMatch(/^\d+\.\d{2} tons$/);
    });

    it("should calculate quantity for gravel correctly", () => {
      const result = calculateMaterialQuantity(1000, 2, "gravel");
      expect(result.unit).toBe("tons");
      expect(result.quantity).toBeGreaterThan(0);
      // Gravel should be lighter than hotmix
      const hotmixResult = calculateMaterialQuantity(1000, 2, "hotmix");
      expect(result.quantity).toBeLessThan(hotmixResult.quantity);
    });

    it("should handle different depths", () => {
      const shallow = calculateMaterialQuantity(1000, 1, "hotmix");
      const deep = calculateMaterialQuantity(1000, 4, "hotmix");
      expect(deep.quantity).toBeGreaterThan(shallow.quantity);
    });

    it("should handle different areas", () => {
      const small = calculateMaterialQuantity(500, 2, "hotmix");
      const large = calculateMaterialQuantity(2000, 2, "hotmix");
      expect(large.quantity).toBeGreaterThan(small.quantity);
    });

    it("rejects unsafe quote measurements", () => {
      expect(() => calculateMaterialQuantity(-1, 2, "hotmix")).toThrow(
        RangeError
      );
      expect(() => calculateMaterialQuantity(1000, 24, "hotmix")).toThrow(
        RangeError
      );
    });
  });

  describe("calculateTotalCost", () => {
    it("should calculate total cost correctly", () => {
      const cost = calculateTotalCost(2.5, 45);
      expect(cost).toBe("$112.50");
    });

    it("should handle zero quantity", () => {
      const cost = calculateTotalCost(0, 45);
      expect(cost).toBe("$0.00");
    });

    it("should handle zero price", () => {
      const cost = calculateTotalCost(2.5, 0);
      expect(cost).toBe("$0.00");
    });

    it("should handle decimal prices", () => {
      const cost1 = calculateTotalCost(2, 50);
      expect(cost1).toBe("$100.00");

      const cost2 = calculateTotalCost(2, 50.5);
      expect(cost2).toBe("$101.00");
    });

    it("should round to two decimal places", () => {
      const cost = calculateTotalCost(3, 33.333);
      expect(cost).toBe("$100.00");
    });

    it("rejects invalid cost inputs", () => {
      expect(() => calculateTotalCost(Number.NaN, 45)).toThrow(RangeError);
      expect(() => calculateTotalCost(1, -45)).toThrow(RangeError);
    });
  });

  describe("normalizeZipCode", () => {
    it("normalizes ZIP+4 values to the base ZIP", () => {
      expect(normalizeZipCode("10001-1234")).toBe("10001");
    });

    it("rejects invalid ZIP code input", () => {
      expect(() => normalizeZipCode("../10001")).toThrow("Invalid ZIP code");
    });
  });
});
