import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { projectsRouter } from "./routers/projects";
import { pricingRouter } from "./routers/pricing";
import { imageRouter } from "./routers/image";

function createLocalOpenId() {
  return `local:${randomUUID()}`;
}

async function requireAuthDatabase() {
  const database = await db.getDb();
  if (!database) {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "Authentication database is unavailable",
    });
  }
}

async function createSessionForUser(
  ctx: {
    req: Parameters<typeof getSessionCookieOptions>[0];
    res: {
      cookie: (
        name: string,
        value: string,
        options: Record<string, unknown>
      ) => void;
    };
  },
  user: { openId: string; name: string | null }
) {
  const sessionToken = await sdk.createSessionToken(user.openId, {
    name: user.name ?? "",
  });

  ctx.res.cookie(COOKIE_NAME, sessionToken, {
    ...getSessionCookieOptions(ctx.req),
    maxAge: ONE_YEAR_MS,
  });
}

async function createDeviceSession(ctx: {
  req: Parameters<typeof getSessionCookieOptions>[0];
  res: {
    cookie: (
      name: string,
      value: string,
      options: Record<string, unknown>
    ) => void;
  };
}) {
  await requireAuthDatabase();

  const createdUser = await db.createUser({
    openId: createLocalOpenId(),
    name: "Device Workspace",
    email: null,
    role: "user",
    lastSignedIn: new Date(),
  });

  await createSessionForUser(ctx, createdUser);
  return createdUser;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    bootstrap: publicProcedure.mutation(async ({ ctx }) => {
      if (ctx.user) {
        return ctx.user;
      }

      return createDeviceSession(ctx);
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  projects: projectsRouter,
  pricing: pricingRouter,
  image: imageRouter,
});

export type AppRouter = typeof appRouter;
