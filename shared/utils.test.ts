import { describe, it, expect } from "vitest";

// Utility helpers — adapt imports to match whatever is exported from shared/
// These tests validate formatting and calculation helpers used by both client and server.

// ── Inline helpers (mirrors what a shared/utils.ts would export) ─────────────
function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatSqFt(sqft: number): string {
  return `${sqft.toLocaleString()} sq ft`;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

function percentageToPixels(pct: number, dimension: number): number {
  return (pct / 100) * dimension;
}

function materialLabel(key: string): string {
  const labels: Record<string, string> = {
    hotmix: "Hot Mix Asphalt",
    millings: "Asphalt Millings",
    tar_and_chip: "Tar & Chip",
    gravel: "Gravel",
  };
  return labels[key] ?? key;
}

describe("Shared Utilities", () => {
  describe("formatCurrency", () => {
    it("formats whole numbers", () => expect(formatCurrency(100)).toBe("$100.00"));
    it("formats decimals", () => expect(formatCurrency(99.9)).toBe("$99.90"));
    it("formats zero", () => expect(formatCurrency(0)).toBe("$0.00"));
    it("formats large values", () => expect(formatCurrency(12345.678)).toBe("$12345.68"));
  });

  describe("formatSqFt", () => {
    it("formats small areas", () => expect(formatSqFt(640)).toBe("640 sq ft"));
    it("formats large areas with locale separator", () => {
      const result = formatSqFt(12000);
      expect(result).toContain("sq ft");
      expect(result).toContain("12");
    });
  });

  describe("clamp", () => {
    it("clamps below min", () => expect(clamp(-5, 0, 100)).toBe(0));
    it("clamps above max", () => expect(clamp(150, 0, 100)).toBe(100));
    it("passes through in-range values", () => expect(clamp(50, 0, 100)).toBe(50));
    it("handles equal min/max", () => expect(clamp(50, 75, 75)).toBe(75));
  });

  describe("percentageToPixels", () => {
    it("converts 50% of 1000px to 500", () => expect(percentageToPixels(50, 1000)).toBe(500));
    it("converts 0% to 0", () => expect(percentageToPixels(0, 1000)).toBe(0));
    it("converts 100% to full dimension", () => expect(percentageToPixels(100, 800)).toBe(800));
    it("handles fractional percentages", () => expect(percentageToPixels(33.5, 200)).toBeCloseTo(67, 0));
  });

  describe("materialLabel", () => {
    it.each([
      ["hotmix", "Hot Mix Asphalt"],
      ["millings", "Asphalt Millings"],
      ["tar_and_chip", "Tar & Chip"],
      ["gravel", "Gravel"],
    ])("maps %s → %s", (key, expected) => {
      expect(materialLabel(key)).toBe(expected);
    });
    it("returns key as fallback for unknown material", () => {
      expect(materialLabel("unknown_material")).toBe("unknown_material");
    });
  });
});
