import type { Request } from "express";
import { describe, expect, it } from "vitest";
import { getSessionCookieOptions } from "./cookies";

function createRequest(
  protocol: string,
  forwardedProto?: string | string[]
): Request {
  return {
    protocol,
    headers:
      forwardedProto === undefined
        ? {}
        : { "x-forwarded-proto": forwardedProto },
  } as Request;
}

describe("getSessionCookieOptions", () => {
  it("uses Secure and SameSite=None for direct HTTPS requests", () => {
    expect(getSessionCookieOptions(createRequest("https"))).toMatchObject({
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true,
    });
  });

  it("trusts HTTPS from x-forwarded-proto when behind a proxy", () => {
    expect(
      getSessionCookieOptions(createRequest("http", "http, https"))
    ).toMatchObject({
      sameSite: "none",
      secure: true,
    });
  });

  it("uses SameSite=Lax without Secure for local HTTP requests", () => {
    expect(getSessionCookieOptions(createRequest("http"))).toMatchObject({
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: false,
    });
  });
});
