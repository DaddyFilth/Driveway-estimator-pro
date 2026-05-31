import type { Express } from "express";
import { ENV } from "./env";
import {
  LOCAL_STORAGE_DIR,
  LOCAL_STORAGE_URL_PREFIX,
} from "../storage";
import path from "node:path";

const isValidStorageKey = (key: string) =>
  key.length > 0 && key.length <= 512 && !key.includes("..") && !key.includes("\\");

export function registerStorageProxy(app: Express) {
  app.get(`${LOCAL_STORAGE_URL_PREFIX}/*`, (req, res) => {
    if (ENV.isProduction) {
      res.status(404).send("Not found");
      return;
    }

    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!isValidStorageKey(key)) {
      res.status(400).send("Invalid storage key");
      return;
    }

    const filePath = path.resolve(LOCAL_STORAGE_DIR, key);
    const storageRoot = `${LOCAL_STORAGE_DIR}${path.sep}`;

    if (!filePath.startsWith(storageRoot)) {
      res.status(400).send("Invalid storage key");
      return;
    }

    res.set("Cache-Control", "no-store");
    res.sendFile(filePath, err => {
      if (err && !res.headersSent) {
        res.status(404).send("Stored file not found");
      }
    });
  });

  app.get("/openapi-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!isValidStorageKey(key)) {
      res.status(400).send("Invalid storage key");
      return;
    }

    if (!ENV.openApiBaseUrl || !ENV.openApiApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const storageUrl = new URL(
        ENV.openApiStoragePresignGetPath.replace(/^\//, ""),
        ENV.openApiBaseUrl.replace(/\/+$/, "") + "/"
      );
      storageUrl.searchParams.set("path", key);

      const storageResp = await fetch(storageUrl, {
        headers: { Authorization: `Bearer ${ENV.openApiApiKey}` },
      });

      if (!storageResp.ok) {
        const body = await storageResp.text().catch(() => "");
        console.error(
          `[StorageProxy] OpenAPI storage error: ${storageResp.status} ${body}`
        );
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await storageResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
