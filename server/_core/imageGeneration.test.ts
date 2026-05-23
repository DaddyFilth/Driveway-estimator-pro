import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("./env", () => ({
  ENV: {
    forgeApiUrl: "",
    forgeApiKey: "",
    isProduction: false,
  },
}));

import { ENV } from "./env";
import { generateImage } from "./imageGeneration";

describe("generateImage", () => {
  beforeEach(() => {
    ENV.forgeApiUrl = "";
    ENV.forgeApiKey = "";
    ENV.isProduction = false;
  });

  it("uses the original image as a local development fallback", async () => {
    const result = await generateImage({
      prompt: "Apply asphalt",
      originalImages: [
        {
          url: "http://127.0.0.1:3000/local-storage/photo.jpg",
          mimeType: "image/jpeg",
        },
      ],
    });

    expect(result).toEqual({
      url: "http://127.0.0.1:3000/local-storage/photo.jpg",
      mimeType: "image/jpeg",
      usedFallback: true,
    });
  });

  it("fails closed in production when the image service is not configured", async () => {
    ENV.isProduction = true;

    await expect(
      generateImage({
        prompt: "Apply asphalt",
        originalImages: [
          {
            url: "https://example.com/photo.jpg",
            mimeType: "image/jpeg",
          },
        ],
      })
    ).rejects.toThrow("Image generation service is not configured");
  });
});
