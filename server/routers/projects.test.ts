import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock all external I/O so the router runs without DB/LLM/S3 ──────────────
vi.mock("../db", () => ({
  getUserProjects: vi.fn().mockResolvedValue([]),
  getProjectById: vi.fn().mockResolvedValue(null),
  createProject: vi.fn().mockResolvedValue({ id: 1 }),
  updateProject: vi.fn().mockResolvedValue(undefined),
  deleteProject: vi.fn().mockResolvedValue(undefined),
  createProjectShare: vi.fn().mockResolvedValue(undefined),
  getProjectShareByToken: vi.fn().mockResolvedValue(null),
  getMaterialPrices: vi.fn().mockResolvedValue(null),
  upsertMaterialPrice: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    key: "projects/captures/driveway-photo.jpg",
    url: "https://s3.example.com/photo.jpg",
  }),
}));

vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            corners: [
              { x: 10, y: 10 },
              { x: 90, y: 10 },
              { x: 90, y: 90 },
              { x: 10, y: 90 },
            ],
            confidence: 0.92,
            description: "Rectangular driveway detected",
          }),
        },
      },
    ],
  }),
}));

vi.mock("../_core/imageGeneration", () => ({
  generateImage: vi
    .fn()
    .mockResolvedValue({ url: "https://s3.example.com/preview.jpg" }),
}));

vi.mock("../services/email", () => ({
  sendEstimateNotification: vi.fn().mockResolvedValue(undefined),
  sendContractorNotification: vi.fn().mockResolvedValue(undefined),
}));

import {
  getMaterialPricingForZip,
  calculateMaterialQuantity,
  calculateTotalCost,
} from "../services/pricing";
import {
  detectDrivewayEdges,
  calculateSquareFeetFromCorners,
} from "../services/edgeDetection";
import { appRouter } from "../routers";
import {
  createProject,
  createProjectShare,
  getProjectById,
  getProjectShareByToken,
} from "../db";
import {
  sendContractorNotification,
  sendEstimateNotification,
} from "../services/email";

const mockedCreateProject = vi.mocked(createProject);
const mockedCreateProjectShare = vi.mocked(createProjectShare);
const mockedGetProjectById = vi.mocked(getProjectById);
const mockedGetProjectShareByToken = vi.mocked(getProjectShareByToken);
const mockedSendEstimateNotification = vi.mocked(sendEstimateNotification);
const mockedSendContractorNotification = vi.mocked(sendContractorNotification);

function createAuthedCaller() {
  return appRouter.createCaller({
    user: {
      id: 7,
      openId: "google-user",
      name: "Owner Name",
      email: "owner@example.com",
      role: "user",
    } as any,
    req: {
      headers: {
        host: "app.example.com",
      },
      protocol: "https",
    } as any,
    res: {
      clearCookie: vi.fn(),
    } as any,
  });
}

function createPublicCaller(ip = "127.0.0.1") {
  return appRouter.createCaller({
    user: null,
    req: {
      headers: {
        host: "app.example.com",
      },
      ip,
      protocol: "https",
    } as any,
    res: {
      clearCookie: vi.fn(),
    } as any,
  });
}

const savedProjectInput = {
  projectName: "Front Driveway",
  photoUrl: "/local-storage/projects/7/photo.jpg",
  photoKey: "projects/7/photo.jpg",
  squareFeet: 640,
  depthInches: 2,
  cornerPoints: [
    { x: 10, y: 10 },
    { x: 90, y: 10 },
    { x: 90, y: 90 },
    { x: 10, y: 90 },
  ],
  selectedMaterial: "hotmix" as const,
  zipCode: "10001",
  contractorEmail: "contractor@example.com",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedCreateProject.mockResolvedValue({ id: 1 });
  mockedGetProjectById.mockResolvedValue(null);
  mockedGetProjectShareByToken.mockResolvedValue(null);
});

// ── Unit tests for the service functions called inside the router ───────────
describe("Router — service integration (unit)", () => {
  describe("pricing pipeline", () => {
    it("returns correct total for hotmix default zip", async () => {
      const pricing = await getMaterialPricingForZip("99999", "hotmix");
      expect(pricing.pricePerTon).toBe(75);
      const qty = calculateMaterialQuantity(640, 2, "hotmix");
      expect(qty.quantity).toBeGreaterThan(0);
      const total = calculateTotalCost(qty.quantity, pricing.pricePerTon);
      expect(total).toMatch(/^\$\d+\.\d{2}$/);
    });

    it("returns numeric pricePerTon and pricePerSquareFoot", async () => {
      const pricing = await getMaterialPricingForZip("10001", "millings");
      expect(typeof pricing.pricePerTon).toBe("number");
      expect(typeof pricing.pricePerSquareFoot).toBe("number");
      expect(pricing.supplier).toBeTruthy();
    });

    it("all four materials resolve without error", async () => {
      const materials = [
        "hotmix",
        "millings",
        "tar_and_chip",
        "gravel",
      ] as const;
      for (const m of materials) {
        await expect(
          getMaterialPricingForZip("90210", m)
        ).resolves.not.toThrow();
      }
    });
  });

  describe("edge detection pipeline", () => {
    it("detectDrivewayEdges returns shaped result from mocked LLM", async () => {
      const result = await detectDrivewayEdges("https://example.com/photo.jpg");
      expect(result.corners).toHaveLength(4);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.description).toBeTruthy();
      result.corners.forEach(c => {
        expect(c.x).toBeGreaterThanOrEqual(0);
        expect(c.y).toBeGreaterThanOrEqual(0);
      });
    });

    it("square footage is calculated from detected corners", async () => {
      const { corners } = await detectDrivewayEdges(
        "https://example.com/photo.jpg"
      );
      const sqft = calculateSquareFeetFromCorners(corners, 1000, 1000, 10);
      expect(sqft).toBeGreaterThanOrEqual(100);
    });
  });
});

describe("projects.create", () => {
  it("recomputes pricing server-side and persists the emailed share link", async () => {
    const caller = createAuthedCaller();

    const result = await caller.projects.create({
      ...savedProjectInput,
      contractorPricePerSquareFoot: 4.25,
      quantityNeeded: "1.00 tons",
      totalCost: "$1.00",
    } as any);

    expect(result.projectId).toBe(1);
    expect(result.materialCost).toBe("$504.05");
    expect(result.laborCost).toBe("$2,720.00");
    expect(result.totalCost).toBe("$3,224.05");
    expect(result.quantityNeeded).toBe("5.93 tons");
    expect(mockedCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        projectName: "Front Driveway",
        quantityNeeded: "5.93 tons",
        pricePerUnit: "$85.00",
        materialCost: "$504.05",
        contractorPricePerSquareFoot: "$4.25",
        laborCost: "$2,720.00",
        totalCost: "$3,224.05",
        zipCode: "10001",
      })
    );
    expect(mockedCreateProjectShare).toHaveBeenCalledWith({
      projectId: 1,
      shareToken: expect.any(String),
      contractorEmail: "contractor@example.com",
    });
    expect(mockedSendEstimateNotification).toHaveBeenCalledWith(
      "owner@example.com",
      "Front Driveway",
      640,
      "hotmix",
      "$3,224.05",
      expect.stringContaining("/share/")
    );
    expect(mockedSendContractorNotification).toHaveBeenCalledWith(
      "contractor@example.com",
      "Owner Name",
      "Front Driveway",
      640,
      "hotmix",
      "$3,224.05",
      expect.stringContaining("/share/")
    );
  });
});

describe("projects.uploadPhotoAndDetectEdges", () => {
  it("allows authenticated driveway capture and edge detection", async () => {
    const caller = createAuthedCaller();

    const result = await caller.projects.uploadPhotoAndDetectEdges({
      photoBase64:
        "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAVEAEBAAAAAAAAAAAAAAAAAAAAEf/aAAwDAQACEAMQAAAB6A//xAAUEQEAAAAAAAAAAAAAAAAAAAAQ/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAQ/9oACAEDAQE/AR//xAAUEQEAAAAAAAAAAAAAAAAAAAAQ/9oACAECAQE/AR//2Q==",
      photoName: "driveway.jpg",
      photoMimeType: "image/jpeg",
      imageWidth: 1280,
      imageHeight: 720,
    });

    expect(result.photoUrl).toBe("https://s3.example.com/photo.jpg");
    expect(result.photoKey).toBe("projects/captures/driveway-photo.jpg");
    expect(result.corners).toHaveLength(4);
    expect(result.squareFeet).toBeGreaterThan(0);
  });
});

describe("projects share and export tools", () => {
  const shareToken = "validShareToken_1234567890ABCDEF";
  const project = {
    id: 42,
    userId: 7,
    projectName: "../../Oak Ridge Driveway!",
    photoUrl: "/local-storage/projects/7/photo.jpg",
    photoKey: "projects/7/photo.jpg",
    squareFeet: 640,
    depthInches: 2,
    cornerPoints: JSON.stringify(savedProjectInput.cornerPoints),
    selectedMaterial: "hotmix",
    quantityNeeded: "5.93 tons",
    pricePerUnit: "$85.00",
    materialCost: "$504.05",
    contractorPricePerSquareFoot: "$4.25",
    laborCost: "$2,720.00",
    totalCost: "$3,224.05",
    zipCode: "10001",
    latitude: null,
    longitude: null,
    previewImageUrl: null,
    previewImageKey: null,
    contractorEmail: null,
    notes: null,
    createdAt: new Date("2026-05-10T12:00:00.000Z"),
    updatedAt: new Date("2026-05-10T12:00:00.000Z"),
  };

  function mockShare(overrides: Record<string, unknown> = {}) {
    mockedGetProjectShareByToken.mockResolvedValue({
      id: 1,
      projectId: 42,
      shareToken,
      contractorEmail: "contractor@example.com",
      createdAt: new Date("2026-05-10T12:00:00.000Z"),
      expiresAt: null,
      viewCount: 0,
      ...overrides,
    } as any);
  }

  it("creates share links from the request origin and trims contractor email", async () => {
    mockedGetProjectById.mockResolvedValue(project as any);
    const caller = createAuthedCaller();

    const result = await caller.projects.createShareLink({
      projectId: 42,
      contractorEmail: " contractor@example.com ",
    });

    expect(result.shareLink).toMatch(
      /^https:\/\/app\.example\.com\/share\/[A-Za-z0-9_-]+$/
    );
    expect(mockedCreateProjectShare).toHaveBeenCalledWith({
      projectId: 42,
      shareToken: expect.any(String),
      contractorEmail: "contractor@example.com",
    });
    expect(mockedSendContractorNotification).toHaveBeenCalledWith(
      "contractor@example.com",
      "Owner Name",
      "../../Oak Ridge Driveway!",
      640,
      "hotmix",
      "$3,224.05",
      result.shareLink
    );
  });

  it("sanitizes generated PDF filenames", async () => {
    mockedGetProjectById.mockResolvedValue(project as any);
    const caller = createAuthedCaller();

    const result = await caller.projects.downloadPDF({ projectId: 42 });

    expect(result.filename).toMatch(
      /^driveway-estimate-oak-ridge-driveway-\d+\.pdf$/
    );
    expect(result.pdfBase64.length).toBeGreaterThan(0);
  });

  it("returns only contractor-safe fields for public shared projects", async () => {
    mockShare();
    mockedGetProjectById.mockResolvedValue(project as any);
    const caller = createPublicCaller();

    const result = await caller.projects.getSharedProject({ shareToken });

    expect(result).toMatchObject({
      projectName: "../../Oak Ridge Driveway!",
      photoUrl: "/local-storage/projects/7/photo.jpg",
      squareFeet: 640,
      depthInches: 2,
      selectedMaterial: "hotmix",
      materialCost: "$504.05",
      totalCost: "$3,224.05",
    });
    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("userId");
    expect(result).not.toHaveProperty("photoKey");
    expect(result).not.toHaveProperty("previewImageKey");
    expect(result).not.toHaveProperty("contractorEmail");
    expect(result).not.toHaveProperty("cornerPoints");
  });

  it("downloads shared project PDFs through the share token", async () => {
    mockShare();
    mockedGetProjectById.mockResolvedValue(project as any);
    const caller = createPublicCaller();

    const result = await caller.projects.downloadSharedPDF({ shareToken });

    expect(result.filename).toMatch(
      /^driveway-estimate-oak-ridge-driveway-\d+\.pdf$/
    );
    expect(result.pdfBase64.length).toBeGreaterThan(0);
  });

  it("rejects expired share links", async () => {
    mockShare({ expiresAt: new Date("2020-01-01T00:00:00.000Z") });
    mockedGetProjectById.mockResolvedValue(project as any);
    const caller = createPublicCaller();

    await expect(
      caller.projects.getSharedProject({ shareToken })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mockedGetProjectById).not.toHaveBeenCalled();
  });
});

// ── Full getPricing output shape ─────────────────────────────────────────────
describe("getPricing output shape", () => {
  it("totalCost is a formatted currency string", async () => {
    const pricing = await getMaterialPricingForZip("75022", "gravel");
    const qty = calculateMaterialQuantity(500, 3, "gravel");
    const total = calculateTotalCost(qty.quantity, pricing.pricePerTon);
    expect(total).toMatch(/^\$[0-9]+\.[0-9]{2}$/);
  });

  it("quantityStr matches expected format", () => {
    const { quantityStr } = calculateMaterialQuantity(800, 2, "tar_and_chip");
    expect(quantityStr).toMatch(/^\d+\.\d{2} tons$/);
  });
});
