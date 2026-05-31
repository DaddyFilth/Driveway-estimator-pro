import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_NAME } from "../shared/const";

const dbMock = vi.hoisted(() => ({
  getDb: vi.fn().mockResolvedValue({}),
  createUser: vi.fn(),
}));

const sdkMock = vi.hoisted(() => ({
  createSessionToken: vi.fn().mockResolvedValue("session-token"),
}));

vi.mock("./db", () => dbMock);
vi.mock("./_core/sdk", () => ({
  sdk: sdkMock,
}));

import { appRouter } from "./routers";

function createContext() {
  const cookies: Array<{
    name: string;
    value: string;
    options: Record<string, unknown>;
  }> = [];

  return {
    cookies,
    ctx: {
      user: null,
      req: {
        protocol: "https",
        headers: {},
        ip: "127.0.0.1",
      } as any,
      res: {
        cookie: (
          name: string,
          value: string,
          options: Record<string, unknown>
        ) => {
          cookies.push({ name, value, options });
        },
        clearCookie: vi.fn(),
      } as any,
    },
  };
}

describe("device workspace auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.getDb.mockResolvedValue({});
    sdkMock.createSessionToken.mockResolvedValue("session-token");
  });

  it("bootstraps a device workspace and sets a session cookie", async () => {
    const deviceUser = {
      id: 11,
      openId: "local:device-user",
      name: "Device Workspace",
      email: null,
      role: "user" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    dbMock.createUser.mockResolvedValue(deviceUser);

    const { ctx, cookies } = createContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.bootstrap();

    expect(result).toEqual(deviceUser);
    expect(dbMock.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Device Workspace",
        role: "user",
      })
    );
    expect(cookies[0]?.name).toBe(COOKIE_NAME);
    expect(cookies[0]?.value).toBe("session-token");
  });
});
