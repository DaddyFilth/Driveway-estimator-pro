# easy-asphalt API Documentation

All endpoints are **tRPC procedures** under the `projects` router.
Base path: `/trpc/projects.<procedureName>`

---

## `uploadPhotoAndDetectEdges` — Mutation

Uploads a driveway photo to S3 and runs AI edge detection.

**Input:** `photoBase64` (string), `photoName` (string), `photoMimeType` (string), `imageWidth` (number), `imageHeight` (number)

**Output:** `photoUrl`, `photoKey`, `corners` (CornerPoint[]), `squareFeet` (number), `confidence` (number|null), `description` (string|null)

---

## `getPricing` — Query

Returns local material pricing for a given ZIP, material, and area.

**Input:** `zipCode` (string), `material` (Material), `squareFeet` (number), `depthInches` (number)

**Output:** `pricePerSquareFoot`, `pricePerTon`, `quantityNeeded`, `materialCost`, `totalCost`

> **Note:** Currently uses `mockPricingByZip`. Replace with a real supplier API for production.

---

## `generateMaterialPreview` — Mutation

Generates a photorealistic AI preview of the driveway with the selected material applied.

**Input:** `photoUrl` (string), `photoMimeType` (string), `material` (Material), `editPrompt` (string|undefined)

**Output:** `previewUrl` (string), `previewKey` (string|null), `usedFallback` (boolean)

---

## `create` — Mutation

Creates a new project record with all estimate details.

**Input:** `projectName`, `photoUrl`, `photoKey`, `squareFeet`, `depthInches`, `cornerPoints`, `selectedMaterial`, `zipCode`, `latitude?`, `longitude?`, `previewImageUrl?`, `previewImageKey?`, `contractorEmail?`, `contractorPricePerSquareFoot?`, `notes?`

**Output:** `projectId` (number)

---

## `finalizeInvoice` — Mutation

Locks in the final invoice, appending any additional line-item costs.

**Input:** `projectId` (number), `additionalCosts` ({ label: string; amount: number }[])

**Output:** void

---

## Shared Types

```typescript
type Material = 'hotmix' | 'millings' | 'tar_and_chip' | 'gravel';

interface CornerPoint {
  x: number; // percentage of image width (0-100)
  y: number; // percentage of image height (0-100)
}
```

---

## Production Readiness

| Service | Current State | Action Required |
|---|---|---|
| Pricing | mockPricingByZip | Integrate real supplier API |
| Email | console.log | Integrate SendGrid or AWS SES |
| Geolocation | Defaults to ZIP 10001 | Add reverse geocoding |
| AI Preview | Live via LLM | Verify API key in production env |
