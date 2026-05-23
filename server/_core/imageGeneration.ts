/**
 * Image generation helper using internal ImageService
 *
 * Example usage:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "A serene landscape with mountains"
 *   });
 *
 * For editing:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "Add a rainbow to this landscape",
 *     originalImages: [{
 *       url: "https://example.com/original.jpg",
 *       mimeType: "image/jpeg"
 *     }]
 *   });
 */
import { storagePut } from "../storage";
import { ENV } from "./env";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
  key?: string;
  mimeType?: string;
  usedFallback?: boolean;
};

type ImageProviderConfig = {
  baseUrl: string;
  apiKey: string;
  source: "forge" | "openai";
};

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, "");
const normalizePath = (path: string) => path.replace(/^\//, "");

function resolveImageConfig(): ImageProviderConfig | null {
  if (ENV.forgeApiUrl || ENV.forgeApiKey) {
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      throw new Error(
        "BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY must both be configured"
      );
    }
    return {
      baseUrl: normalizeBaseUrl(ENV.forgeApiUrl),
      apiKey: ENV.forgeApiKey,
      source: "forge",
    };
  }

  if (ENV.openAiBaseUrl || ENV.openAiApiKey) {
    if (!ENV.openAiBaseUrl || !ENV.openAiApiKey) {
      throw new Error(
        "OPENAI_BASE_URL and OPENAI_API_KEY must both be configured"
      );
    }
    return {
      baseUrl: normalizeBaseUrl(ENV.openAiBaseUrl),
      apiKey: ENV.openAiApiKey,
      source: "openai",
    };
  }

  return null;
}

async function fetchImageBuffer(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Failed to download original image (${response.status} ${response.statusText})${
        detail ? `: ${detail}` : ""
      }`
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers.get("content-type") || "image/png";
  return { buffer, mimeType };
}

async function resolveOriginalImage(
  originalImage?: GenerateImageOptions["originalImages"][number]
) {
  if (!originalImage) {
    return null;
  }

  if (originalImage.b64Json) {
    return {
      buffer: Buffer.from(originalImage.b64Json, "base64"),
      mimeType: originalImage.mimeType || "image/png",
    };
  }

  if (originalImage.url) {
    const { buffer, mimeType } = await fetchImageBuffer(originalImage.url);
    return {
      buffer,
      mimeType: originalImage.mimeType || mimeType || "image/png",
    };
  }

  return null;
}

function getImageExtension(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/png") return "png";
  return "png";
}

async function generateImageWithForge(
  options: GenerateImageOptions,
  config: ImageProviderConfig
): Promise<GenerateImageResponse> {
  const baseUrl = `${config.baseUrl}/`;
  const fullUrl = new URL(
    "images.v1.ImageService/GenerateImage",
    baseUrl
  ).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      prompt: options.prompt,
      original_images: options.originalImages || [],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Image generation request failed (${response.status} ${response.statusText})${
        detail ? `: ${detail}` : ""
      }`
    );
  }

  const result = (await response.json()) as {
    image: {
      b64Json: string;
      mimeType: string;
    };
  };
  const base64Data = result.image.b64Json;
  const buffer = Buffer.from(base64Data, "base64");

  const { key, url } = await storagePut(
    `generated/${Date.now()}.png`,
    buffer,
    result.image.mimeType
  );
  return {
    key,
    url,
    mimeType: result.image.mimeType,
  };
}

async function generateImageWithOpenAI(
  options: GenerateImageOptions,
  config: ImageProviderConfig
): Promise<GenerateImageResponse> {
  const originalImage = options.originalImages?.[0];
  const resolvedOriginal = await resolveOriginalImage(originalImage);
  const isEdit = Boolean(resolvedOriginal);
  const endpoint = isEdit ? "images/edits" : "images/generations";

  const formData = new FormData();
  formData.append("model", ENV.openAiImageModel);
  formData.append("prompt", options.prompt);
  formData.append("response_format", "b64_json");

  let outputMimeType = "image/png";
  if (resolvedOriginal) {
    outputMimeType = resolvedOriginal.mimeType || outputMimeType;
    const extension = getImageExtension(outputMimeType);
    const imageBlob = new Blob([resolvedOriginal.buffer], {
      type: resolvedOriginal.mimeType,
    });
    formData.append("image", imageBlob, `image.${extension}`);
  }

  const fullUrl = new URL(
    normalizePath(endpoint),
    `${config.baseUrl}/`
  ).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `OpenAI image generation failed (${response.status} ${response.statusText})${
        detail ? `: ${detail}` : ""
      }`
    );
  }

  const result = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  const imageResult = result.data?.[0];
  if (!imageResult) {
    throw new Error("OpenAI image generation returned no data");
  }

  let buffer: Buffer | null = null;
  if (imageResult.b64_json) {
    buffer = Buffer.from(imageResult.b64_json, "base64");
  } else if (imageResult.url) {
    const fetched = await fetchImageBuffer(imageResult.url);
    buffer = fetched.buffer;
    outputMimeType = fetched.mimeType || outputMimeType;
  }

  if (!buffer) {
    throw new Error("OpenAI image generation returned empty image payload");
  }

  const { key, url } = await storagePut(
    `generated/${Date.now()}.png`,
    buffer,
    outputMimeType
  );
  return {
    key,
    url,
    mimeType: outputMimeType,
  };
}

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const originalImage = options.originalImages?.[0];

  try {
    const config = resolveImageConfig();
    if (!config) {
      if (!ENV.isProduction && originalImage?.url) {
        return {
          url: originalImage.url,
          mimeType: originalImage.mimeType,
          usedFallback: true,
        };
      }

      throw new Error(
        "Image generation service is not configured: set OPENAI_BASE_URL/OPENAI_API_KEY or BUILT_IN_FORGE_API_URL/BUILT_IN_FORGE_API_KEY"
      );
    }

    if (config.source === "forge") {
      return await generateImageWithForge(options, config);
    }

    return await generateImageWithOpenAI(options, config);
  } catch (error) {
    if (!ENV.isProduction && originalImage?.url) {
      return {
        url: originalImage.url,
        mimeType: originalImage.mimeType,
        usedFallback: true,
      };
    }

    throw error;
  }
}
