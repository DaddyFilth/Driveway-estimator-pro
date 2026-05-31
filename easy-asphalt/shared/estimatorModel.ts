import { nanoid } from "nanoid";

export interface CornerPoint {
  x: number;
  y: number;
}

export const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

export type Step = "upload" | "adjust" | "material" | "preview" | "summary";
export type PreviewMode = "static" | "live";
export type LivePreviewStatus = "idle" | "starting" | "ready" | "error" | "unsupported";
export type Material = "hotmix" | "millings" | "tar_and_chip" | "gravel";
export type EstimateExitAction = "material" | "project" | "dashboard";

export interface AdditionalCostItem {
  id: string;
  label: string;
  amount: string;
}

export interface EstimatorState {
  photoUrl: string | null;
  photoKey: string | null;
  photoMimeType: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  corners: CornerPoint[];
  detectionConfidence: number | null;
  detectionDescription: string;
  squareFeet: number | null;
  depthInches: number;
  selectedMaterial: Material | null;
  zipCode: string;
  latitude: string | null;
  longitude: string | null;
  previewUrl: string | null;
  previewKey: string | null;
  previewMaterial: Material | null;
  previewPrompt: string;
  previewUsedFallback: boolean;
  projectName: string;
  contractorEmail: string;
  contractorPricePerSquareFoot: string;
  notes: string;
}

export interface DeviceReadiness {
  gpsAccuracyFeet: number | null;
  connectionLabel: string;
  online: boolean;
  bluetoothAvailable: boolean | null;
  pitch: number | null;
  roll: number | null;
}

export const materialDisplayNames: Record<Material, string> = {
  hotmix: "Hot Mix Asphalt",
  millings: "Recycled Millings",
  tar_and_chip: "Tar and Chip",
  gravel: "Crushed Gravel",
};

export const defaultPreviewPromptByMaterial: Record<Material, string> = {
  hotmix: "smooth black freshly laid hot mix asphalt driveway",
  millings: "compacted recycled asphalt millings surface",
  tar_and_chip: "textured liquid asphalt with stone chip covering",
  gravel: "uniform crushed grey gravel driveway surface",
};

export const previewPromptSuggestions = [
  "darker finish",
  "more texture",
  "clean edges",
  "wet look",
  "weathered",
];

export function createInitialEstimatorState(): EstimatorState {
  return {
    photoUrl: null,
    photoKey: null,
    photoMimeType: null,
    imageWidth: null,
    imageHeight: null,
    corners: [
      { x: 20, y: 70 },
      { x: 80, y: 70 },
      { x: 90, y: 90 },
      { x: 10, y: 90 },
    ],
    detectionConfidence: null,
    detectionDescription: "",
    squareFeet: null,
    depthInches: 2,
    selectedMaterial: "hotmix",
    zipCode: "10001",
    latitude: null,
    longitude: null,
    previewUrl: null,
    previewKey: null,
    previewMaterial: null,
    previewPrompt: "",
    previewUsedFallback: false,
    projectName: "New Driveway Project",
    contractorEmail: "",
    contractorPricePerSquareFoot: "4.50",
    notes: "",
  };
}

export function createAdditionalCostItem(): AdditionalCostItem {
  return {
    id: nanoid(),
    label: "",
    amount: "",
  };
}

export function buildPolygonClipPath(corners: CornerPoint[]): string {
  if (corners.length === 0) return "none";
  const points = corners.map(c => `${c.x}% ${c.y}%`).join(", ");
  return `polygon(${points})`;
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function parseCurrency(value: string): number {
  return Number.parseFloat(value.replace(/[^0-9.]/g, ""));
}

export function getLiveOverlayStyle(material: Material | null): React.CSSProperties {
  const colors: Record<Material, string> = {
    hotmix: "rgba(20, 20, 20, 0.6)",
    millings: "rgba(60, 60, 60, 0.5)",
    tar_and_chip: "rgba(80, 80, 80, 0.5)",
    gravel: "rgba(120, 120, 120, 0.4)",
  };

  return {
    backgroundColor: material ? colors[material] : "transparent",
    mixBlendMode: "multiply",
  };
}
