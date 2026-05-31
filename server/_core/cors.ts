import type { Express, Request, Response } from "express";

const DEFAULT_MOBILE_ORIGINS = new Set([
  "capacitor://localhost",
  "ionic://localhost",
  "https://localhost",
]);

function normalizeOrigin(value: string) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "";
  }
}

function getConfiguredOrigins() {
  return new Set(
    (process.env.MOBILE_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map(origin => normalizeOrigin(origin.trim()))
      .filter(Boolean)
  );
}

export function isAllowedMobileOrigin(origin: string) {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;

  return (
    DEFAULT_MOBILE_ORIGINS.has(normalizedOrigin) ||
    getConfiguredOrigins().has(normalizedOrigin)
  );
}

function setVaryOrigin(res: Response) {
  const vary = res.getHeader("Vary");
  if (!vary) {
    res.setHeader("Vary", "Origin");
    return;
  }

  const varyValue = Array.isArray(vary) ? vary.join(", ") : String(vary);
  if (!/\bOrigin\b/i.test(varyValue)) {
    res.setHeader("Vary", `${varyValue}, Origin`);
  }
}

export function registerMobileCors(app: Express) {
  app.use((req: Request, res: Response, next) => {
    const origin =
      typeof req.headers.origin === "string" ? req.headers.origin : "";

    if (!origin || !isAllowedMobileOrigin(origin)) {
      next();
      return;
    }

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] || "content-type"
    );
    setVaryOrigin(res);

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  });
}
