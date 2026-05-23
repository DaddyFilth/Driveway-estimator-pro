import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Resend client so no real emails are sent
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: "mock-email-id", error: null }),
    },
  })),
}));

import { sendEstimateNotification, sendContractorNotification } from "./email";

describe("Email Service", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("sendEstimateNotification", () => {
    it("should resolve without throwing", async () => {
      await expect(
        sendEstimateNotification(
          "user@example.com",
          "Front Driveway",
          640,
          "hotmix",
          "$412.50",
          "https://app.example.com/share/abc123"
        )
      ).resolves.not.toThrow();
    });

    it("should handle missing email gracefully", async () => {
      await expect(
        sendEstimateNotification("", "Project", 0, "gravel", "$0.00", "https://x.com")
      ).resolves.not.toThrow();
    });
  });

  describe("sendContractorNotification", () => {
    it("should resolve without throwing", async () => {
      await expect(
        sendContractorNotification(
          "contractor@example.com",
          "John Doe",
          "Back Lot",
          1200,
          "millings",
          "$900.00",
          "https://app.example.com/share/xyz789"
        )
      ).resolves.not.toThrow();
    });
  });
});
