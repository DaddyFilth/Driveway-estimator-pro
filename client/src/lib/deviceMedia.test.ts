import { describe, expect, it } from "vitest";
import {
  extensionForMimeType,
  isAllowedPermissionState,
  isMediaSelectionCanceled,
  normalizeMediaMimeType,
} from "./deviceMedia";

describe("deviceMedia", () => {
  it("treats limited photo access as allowed", () => {
    expect(isAllowedPermissionState("limited")).toBe(true);
    expect(isAllowedPermissionState("granted")).toBe(true);
    expect(isAllowedPermissionState("denied")).toBe(false);
  });

  it("normalizes native image formats to supported MIME types", () => {
    expect(normalizeMediaMimeType("", "jpg")).toBe("image/jpeg");
    expect(normalizeMediaMimeType("", "png")).toBe("image/png");
    expect(normalizeMediaMimeType("image/webp", undefined)).toBe("image/webp");
    expect(normalizeMediaMimeType("", "heic")).toBe("image/heic");
  });

  it("uses safe extensions for supported MIME types", () => {
    expect(extensionForMimeType("image/jpeg")).toBe("jpg");
    expect(extensionForMimeType("image/png")).toBe("png");
    expect(extensionForMimeType("image/webp")).toBe("webp");
  });

  it("detects user-cancelled media flows", () => {
    expect(isMediaSelectionCanceled(new Error("User cancelled photos"))).toBe(
      true
    );
    expect(isMediaSelectionCanceled(new Error("Permission denied"))).toBe(
      false
    );
  });
});
