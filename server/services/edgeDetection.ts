import { invokeLLM, isLlmConfigured } from "../_core/llm";
export { calculateSquareFeetFromCorners } from "../../shared/geometry";

const LLM_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`LLM timed out after ${ms}ms`)), ms)
    ),
  ]);
}

function getFallbackDrivewayEdges() {
  return {
    corners: [
      { x: 24, y: 26 },
      { x: 76, y: 26 },
      { x: 88, y: 88 },
      { x: 12, y: 88 },
    ],
    confidence: 0.35,
    description:
      "Estimated driveway boundary; adjust the corner points before continuing.",
  };
}

/**
 * Use LLM vision to analyze a driveway photo and detect corner points.
 * Returns normalized coordinates as percentage of image dimensions.
 * Uses detail:"low" for faster, cheaper inference — sufficient for boundary detection.
 */
export async function detectDrivewayEdges(photoUrl: string): Promise<{
  corners: Array<{ x: number; y: number }>;
  confidence: number;
  description: string;
}> {
  if (!isLlmConfigured()) {
    return getFallbackDrivewayEdges();
  }

  const call = invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert at analyzing driveway photos and identifying driveway boundaries.

When given a driveway photo you must:
1. Identify the four corners of the driveway (top-left, top-right, bottom-right, bottom-left)
2. Return coordinates as percentages (0-100) of the image width and height
3. Provide a confidence score (0-1) for your detection
4. Describe what you see in one sentence

Return ONLY valid JSON in this exact format:
{
  "corners": [
    {"x": 10, "y": 15},
    {"x": 90, "y": 20},
    {"x": 85, "y": 95},
    {"x": 15, "y": 90}
  ],
  "confidence": 0.95,
  "description": "Clear rectangular driveway with defined edges"
}`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this driveway photo and detect its corners.",
          },
          {
            type: "image_url",
            image_url: {
              url: photoUrl,
              detail: "low", // low = ~85 tokens vs ~1700 for high; sufficient for edge/corner detection
            },
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "driveway_corners",
        strict: true,
        schema: {
          type: "object",
          properties: {
            corners: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  x: { type: "number" },
                  y: { type: "number" },
                },
                required: ["x", "y"],
                additionalProperties: false,
              },
              minItems: 4,
              maxItems: 4,
            },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            description: { type: "string" },
          },
          required: ["corners", "confidence", "description"],
          additionalProperties: false,
        },
      },
    },
  });

  let response;
  try {
    response = await withTimeout(call, LLM_TIMEOUT_MS);
  } catch (error) {
    console.error("[Edge Detection] Error:", error);
    throw new Error(
      `Failed to detect driveway edges: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  const content = response.choices[0]?.message.content;
  if (!content || typeof content !== "string") {
    throw new Error("Invalid response from LLM");
  }

  const parsed = JSON.parse(content);
  return {
    corners: parsed.corners,
    confidence: parsed.confidence,
    description: parsed.description,
  };
}
