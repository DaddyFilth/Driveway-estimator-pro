import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { generateImage } from "../_core/imageGeneration";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";

export const imageRouter = router({
  detectEdges: protectedProcedure
    .input(z.object({ imageUrl: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are an expert at analyzing driveway photos and detecting boundaries. Return a JSON object with cornerPoints (array of {x, y} coordinates as percentages 0-100), confidence (0-1), and description.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this driveway photo and detect the corners of the driveway. Return JSON with cornerPoints, confidence, and description.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: input.imageUrl,
                  },
                },
              ],
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "driveway_detection",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  cornerPoints: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        x: { type: "number" },
                        y: { type: "number" },
                      },
                      required: ["x", "y"],
                    },
                  },
                  confidence: { type: "number" },
                  description: { type: "string" },
                },
                required: ["cornerPoints", "confidence", "description"],
              },
            },
          },
        });

        const content = response.choices[0]?.message.content;
        if (!content || typeof content !== "string") {
          throw new Error("No response from LLM");
        }

        const parsed = JSON.parse(content);
        return {
          cornerPoints: parsed.cornerPoints,
          confidence: parsed.confidence,
          description: parsed.description,
        };
      } catch (error) {
        console.error("[Edge Detection] Error:", error);
        // Return default corners if detection fails
        return {
          cornerPoints: [
            { x: 20, y: 70 },
            { x: 80, y: 70 },
            { x: 90, y: 90 },
            { x: 10, y: 90 },
          ],
          confidence: 0,
          description: "Edge detection failed, using default corners",
        };
      }
    }),

  generatePreview: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string(),
        material: z.enum(["Hot Mix Asphalt", "Recycled Millings", "Tar and Chip", "Gravel"]),
        prompt: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const materialPrompts: Record<string, string> = {
        "Hot Mix Asphalt": "Generate a photorealistic preview showing this driveway paved with hot mix asphalt. The asphalt should be dark gray/black, smooth, and professional looking.",
        "Recycled Millings": "Generate a photorealistic preview showing this driveway paved with recycled asphalt millings. The surface should be dark reddish-brown with a slightly textured appearance.",
        "Tar and Chip": "Generate a photorealistic preview showing this driveway paved with tar and chip. The surface should show small stone chips embedded in a tar binder, with a rustic appearance.",
        Gravel: "Generate a photorealistic preview showing this driveway covered with gravel. The surface should show light tan/brown gravel stones with natural variation.",
      };

      try {
        const { url: previewUrl } = await generateImage({
          prompt: input.prompt || materialPrompts[input.material],
          originalImages: [
            {
              url: input.imageUrl,
              mimeType: "image/jpeg",
            },
          ],
        });

        // Upload preview to storage
        if (!previewUrl) {
          throw new Error("Failed to generate preview image");
        }
        const response = await fetch(previewUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch preview: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        const { url, key } = await storagePut(
          `previews/${nanoid()}.jpg`,
          Buffer.from(buffer),
          "image/jpeg"
        );

        return { previewUrl: url, previewKey: key };
      } catch (error) {
        console.error("[Preview Generation] Error:", error);
        // Return original image if preview generation fails
        return { previewUrl: input.imageUrl, previewKey: "", fallback: true };
      }
    }),
});
