import { describe, it, expect } from "vitest";
import { calculateSquareFeetFromCorners } from "@shared/geometry";

describe("calculateSquareFeetFromCorners", () => {
  const square = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];

  it("full-image square at 10px/ft gives 10000 sq ft", () => {
    // 1000×1000 image, 10px/ft → 100ft × 100ft = 10000 sq ft
    const result = calculateSquareFeetFromCorners(square, 1000, 1000, 10);
    expect(result).toBe(10000);
  });

  it("half-width rectangle is half the area", () => {
    const halfRect = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 100 },
      { x: 0, y: 100 },
    ];
    const full = calculateSquareFeetFromCorners(square, 1000, 1000, 10);
    const half = calculateSquareFeetFromCorners(halfRect, 1000, 1000, 10);
    expect(half).toBe(Math.round(full / 2));
  });

  it("typical driveway (20%×60% of 1920×1080 at 8px/ft) is realistic", () => {
    const driveway = [
      { x: 40, y: 20 },
      { x: 60, y: 20 },
      { x: 60, y: 80 },
      { x: 40, y: 80 },
    ];
    const sqft = calculateSquareFeetFromCorners(driveway, 1920, 1080, 8);
    // 20% of 1920 = 384px wide / 8 = 48ft; 60% of 1080 = 648px tall / 8 = 81ft → ~3888 sq ft
    expect(sqft).toBeGreaterThan(100);
    expect(sqft).toBeLessThan(20000);
  });

  it("enforces 100 sq ft minimum for tiny corner selections", () => {
    const tiny = [
      { x: 49, y: 49 },
      { x: 51, y: 49 },
      { x: 51, y: 51 },
      { x: 49, y: 51 },
    ];
    const result = calculateSquareFeetFromCorners(tiny, 100, 100, 10);
    expect(result).toBeGreaterThanOrEqual(100);
  });

  it("returns the minimum area for invalid measurements", () => {
    const result = calculateSquareFeetFromCorners(square, 0, 100, 10);
    expect(result).toBe(100);
  });
});
