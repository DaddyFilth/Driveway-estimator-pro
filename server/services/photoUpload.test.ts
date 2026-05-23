import { describe, expect, it } from "vitest";
import {
  buildStoredPhotoName,
  decodePhotoBase64,
  isSupportedPhotoMimeType,
  sanitizePhotoName,
} from "./photoUpload";

const tinyPng = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);

describe("photo upload helpers", () => {
  it("accepts only supported image mime types", () => {
    expect(isSupportedPhotoMimeType("image/jpeg")).toBe(true);
    expect(isSupportedPhotoMimeType("image/png")).toBe(true);
    expect(isSupportedPhotoMimeType("image/webp")).toBe(true);
    expect(isSupportedPhotoMimeType("image/svg+xml")).toBe(false);
  });

  it("sanitizes uploaded file names", () => {
    expect(sanitizePhotoName("../../my driveway!.png")).toBe(".._.._my_driveway_.png");
  });

  it("adds the canonical extension for the uploaded mime type", () => {
    expect(buildStoredPhotoName("driveway", "image/png")).toBe("driveway.png");
    expect(buildStoredPhotoName("driveway.jpeg", "image/jpeg")).toBe(
      "driveway.jpeg"
    );
  });

  it("decodes base64 only when it matches the declared image type", () => {
    const decoded = decodePhotoBase64(tinyPng.toString("base64"), "image/png");
    expect(decoded.equals(tinyPng)).toBe(true);

    expect(() =>
      decodePhotoBase64(tinyPng.toString("base64"), "image/jpeg")
    ).toThrow(/declared image type/);
  });
});
