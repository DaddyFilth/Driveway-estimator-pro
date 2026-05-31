export interface CornerPoint {
  x: number;
  y: number;
}

const clampPercent = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;

/**
 * Calculate square footage from normalized corner points and image dimensions.
 * Uses the Shoelace formula for polygon area.
 */
export function calculateSquareFeetFromCorners(
  corners: CornerPoint[],
  imageWidth: number,
  imageHeight: number,
  pixelsPerFoot: number = 10
): number {
  if (
    corners.length < 3 ||
    corners.some(c => !Number.isFinite(c.x) || !Number.isFinite(c.y)) ||
    !Number.isFinite(imageWidth) ||
    !Number.isFinite(imageHeight) ||
    !Number.isFinite(pixelsPerFoot) ||
    imageWidth <= 0 ||
    imageHeight <= 0 ||
    pixelsPerFoot <= 0
  ) {
    return 100;
  }

  const pixelCorners = corners.map(c => ({
    x: (clampPercent(c.x) / 100) * imageWidth,
    y: (clampPercent(c.y) / 100) * imageHeight,
  }));

  let area = 0;
  for (let i = 0; i < pixelCorners.length; i++) {
    const cur = pixelCorners[i];
    const nxt = pixelCorners[(i + 1) % pixelCorners.length];
    area += cur.x * nxt.y - nxt.x * cur.y;
  }

  const pixelArea = Math.abs(area) / 2;
  const squareFeet = Math.round(pixelArea / (pixelsPerFoot * pixelsPerFoot));
  return Math.max(squareFeet, 100);
}
