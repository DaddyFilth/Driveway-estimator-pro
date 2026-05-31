import { describe, expect, it, afterEach } from "vitest";
import { isAllowedMobileOrigin } from "./cors";

const originalAllowedOrigins = process.env.MOBILE_ALLOWED_ORIGINS;

afterEach(() => {
  if (originalAllowedOrigins === undefined) {
    delete process.env.MOBILE_ALLOWED_ORIGINS;
  } else {
    process.env.MOBILE_ALLOWED_ORIGINS = originalAllowedOrigins;
  }
});

describe("mobile CORS origin allowlist", () => {
  it("allows Capacitor app origins", () => {
    expect(isAllowedMobileOrigin("capacitor://localhost")).toBe(true);
    expect(isAllowedMobileOrigin("ionic://localhost")).toBe(true);
    expect(isAllowedMobileOrigin("https://localhost")).toBe(true);
  });

  it("rejects unconfigured web origins", () => {
    expect(isAllowedMobileOrigin("https://evil.example")).toBe(false);
    expect(isAllowedMobileOrigin("not-a-url")).toBe(false);
  });

  it("allows explicitly configured production app origins", () => {
    process.env.MOBILE_ALLOWED_ORIGINS = "https://app.example.com, not-a-url";

    expect(isAllowedMobileOrigin("https://app.example.com/dashboard")).toBe(
      true
    );
    expect(isAllowedMobileOrigin("https://other.example.com")).toBe(false);
  });
});
