import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock pdfkit so tests don't require native bindings
vi.mock("pdfkit", () => {
  const mockDoc = {
    on: vi.fn().mockReturnThis(),
    fontSize: vi.fn().mockReturnThis(),
    font: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
    moveDown: vi.fn().mockReturnThis(),
    rect: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    fillColor: vi.fn().mockReturnThis(),
    strokeColor: vi.fn().mockReturnThis(),
    image: vi.fn().mockReturnThis(),
    addPage: vi.fn().mockReturnThis(),
    end: vi.fn(),
    pipe: vi.fn().mockReturnThis(),
  };
  return { default: vi.fn(() => mockDoc) };
});

import { generateProjectPDF } from "./pdfExport";

const mockProject = {
  id: 1,
  userId: "user_123",
  projectName: "My Driveway",
  photoUrl: "https://example.com/photo.jpg",
  photoKey: "projects/user_123/photo.jpg",
  squareFeet: 640,
  depthInches: 2,
  cornerPoints: JSON.stringify([{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 90 }, { x: 10, y: 90 }]),
  selectedMaterial: "hotmix",
  quantityNeeded: "5.50 tons",
  pricePerUnit: "75.00",
  materialCost: "$412.50",
  contractorPricePerSquareFoot: "$4.25",
  laborCost: "$2,720.00",
  totalCost: "$3,132.50",
  zipCode: "75022",
  latitude: null,
  longitude: null,
  previewImageUrl: null,
  previewImageKey: null,
  contractorEmail: null,
  notes: "Front driveway only",
  createdAt: new Date("2026-01-15"),
  updatedAt: new Date("2026-01-15"),
};

describe("PDF Export Service", () => {
  it("should return a Buffer", async () => {
    const result = await generateProjectPDF(mockProject as any);
    expect(result).toBeInstanceOf(Buffer);
  });

  it("should not throw for a minimal project", async () => {
    const minimal = { ...mockProject, notes: null, previewImageUrl: null };
    await expect(generateProjectPDF(minimal as any)).resolves.not.toThrow();
  });

  it("should handle missing optional fields gracefully", async () => {
    const sparse = {
      ...mockProject,
      projectName: null,
      totalCost: null,
      quantityNeeded: null,
    };
    await expect(generateProjectPDF(sparse as any)).resolves.not.toThrow();
  });
});
