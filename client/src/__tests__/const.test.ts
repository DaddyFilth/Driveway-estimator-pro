import { afterEach, describe, expect, it, vi } from "vitest";
import { getApiBaseUrl, getApiUrl } from "../const";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("API URL helpers", () => {
  it("uses the configured HTTPS API base for native builds", () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://app.example.com/");

    expect(getApiBaseUrl()).toBe("https://app.example.com");
    expect(getApiUrl("/api/trpc")).toBe("https://app.example.com/api/trpc");
  });

  it("ignores unsafe API base URLs", () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://evil.example");

    expect(getApiBaseUrl()).toBe("");
    expect(getApiUrl("/api/trpc")).toBe("/api/trpc");
  });
});
