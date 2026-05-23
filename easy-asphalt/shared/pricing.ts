import { getMaterialPrices, upsertMaterialPrice } from "../server/db";
import { InsertMaterialPrice } from "../drizzle/schema";

export const MATERIALS = [
  "hotmix",
  "millings",
  "tar_and_chip",
  "gravel",
] as const;
export type Material = (typeof MATERIALS)[number];

/** Cache TTL: 24 hours */
const CACHE_TTL_HOURS = 24;
const ZIP_CODE_PATTERN = /^\d{5}(?:-\d{4})?$/;
const MAX_QUOTE_SQUARE_FEET = 1_000_000;
const MIN_DEPTH_INCHES = 1;
const MAX_DEPTH_INCHES = 12;

export function normalizeZipCode(zipCode: string): string {
  const trimmed = zipCode.trim();
  if (!ZIP_CODE_PATTERN.test(trimmed)) {
    throw new Error("Invalid ZIP code");
  }

  return trimmed.slice(0, 5);
}

function assertFiniteRange(
  value: number,
  label: string,
  min: number,
  max: number
) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${label} must be between ${min} and ${max}`);
  }
}

/**
 * Mock pricing data — replace with real supplier API calls in production.
 * Prices are stored as plain numbers (USD); formatting happens at the call site.
 */
const mockPricingByZip: Record<
  string,
  Record<Material, { pricePerTon: number; pricePerSqFt: number }>
> = {
  "10001": {
    hotmix: { pricePerTon: 85, pricePerSqFt: 2.5 },
    millings: { pricePerTon: 35, pricePerSqFt: 1.0 },
    tar_and_chip: { pricePerTon: 45, pricePerSqFt: 1.3 },
    gravel: { pricePerTon: 25, pricePerSqFt: 0.75 },
  },
  "90210": {
    hotmix: { pricePerTon: 95, pricePerSqFt: 2.8 },
    millings: { pricePerTon: 40, pricePerSqFt: 1.2 },
    tar_and_chip: { pricePerTon: 50, pricePerSqFt: 1.5 },
    gravel: { pricePerTon: 30, pricePerSqFt: 0.9 },
  },
  default: {
    hotmix: { pricePerTon: 75, pricePerSqFt: 2.2 },
    millings: { pricePerTon: 30, pricePerSqFt: 0.9 },
    tar_and_chip: { pricePerTon: 40, pricePerSqFt: 1.2 },
    gravel: { pricePerTon: 20, pricePerSqFt: 0.6 },
  },
};

/**
 * Get material pricing for a specific ZIP code.
 * Checks DB cache first; falls back to mock data and writes cache with correct expiresAt.
 * Returns prices as plain numbers — callers format as currency.
 */
export async function getMaterialPricingForZip(
  zipCode: string,
  material: Material
): Promise<{
  pricePerTon: number;
  pricePerSquareFoot: number;
  supplier: string;
}> {
  const normalizedZipCode = normalizeZipCode(zipCode);

  // --- Cache read ---
  const cached = await getMaterialPrices(normalizedZipCode, material);
  if (cached?.expiresAt && new Date(cached.expiresAt) > new Date()) {
    return {
      pricePerTon: parseFloat(cached.pricePerTon),
      pricePerSquareFoot: parseFloat(cached.pricePerSquareFoot),
      supplier: cached.supplier ?? "Local Supplier",
    };
  }

  // --- Fetch (mock or real API) ---
  const pricingData =
    mockPricingByZip[normalizedZipCode] ?? mockPricingByZip.default;
  const materialPrice = pricingData[material];
  if (!materialPrice) {
    throw new Error(`Pricing not available for material: ${material}`);
  }

  // --- Cache write: include expiresAt so next read is a cache hit ---
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

  const cacheEntry: InsertMaterialPrice = {
    zipCode: normalizedZipCode,
    material,
    pricePerTon: materialPrice.pricePerTon.toFixed(2),
    pricePerSquareFoot: materialPrice.pricePerSqFt.toFixed(2),
    supplier: "Regional Supplier",
    expiresAt,
  };

  try {
    await upsertMaterialPrice(cacheEntry);
  } catch (err) {
    console.warn("[Pricing] Failed to cache pricing:", err);
  }

  return {
    pricePerTon: materialPrice.pricePerTon,
    pricePerSquareFoot: materialPrice.pricePerSqFt,
    supplier: "Regional Supplier",
  };
}

/**
 * Calculate material quantity needed for a project.
 * Returns quantity in tons (standard unit for driveway materials).
 */
export function calculateMaterialQuantity(
  squareFeet: number,
  depthInches: number,
  material: Material
): { quantity: number; unit: string; quantityStr: string } {
  assertFiniteRange(squareFeet, "Square feet", 1, MAX_QUOTE_SQUARE_FEET);
  assertFiniteRange(
    depthInches,
    "Depth inches",
    MIN_DEPTH_INCHES,
    MAX_DEPTH_INCHES
  );

  const depthFeet = depthInches / 12;
  const cubicFeet = squareFeet * depthFeet;
  const cubicYards = cubicFeet / 27;

  const densityPerCubicYard: Record<Material, number> = {
    hotmix: 1.5,
    millings: 1.3,
    tar_and_chip: 1.2,
    gravel: 1.0,
  };

  const tons = cubicYards * (densityPerCubicYard[material] ?? 1.2);
  const rounded = Math.round(tons * 100) / 100;

  return {
    quantity: rounded,
    unit: "tons",
    quantityStr: `${rounded.toFixed(2)} tons`,
  };
}

/**
 * Calculate total cost for a project.
 * Accepts pricePerTon as a plain number — no string parsing needed.
 */
export function calculateTotalCost(
  quantity: number,
  pricePerTon: number
): string {
  assertFiniteRange(quantity, "Quantity", 0, Number.MAX_SAFE_INTEGER);
  assertFiniteRange(pricePerTon, "Price per ton", 0, Number.MAX_SAFE_INTEGER);

  return `$${(quantity * pricePerTon).toFixed(2)}`;
}
