import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.BUILT_IN_FORGE_API_KEY = "test-key";
  process.env.BUILT_IN_FORGE_API_URL = "https://api.example.test";
});

import { invokeLLM } from "./llm";

describe("LLM Core", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            { message: { content: '{"test":true}', role: "assistant" } },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      })
    );
  });

  it("returns choices array from provider", async () => {
    const result = await invokeLLM({
      messages: [{ role: "user", content: "hello" }],
    });
    expect(result.choices).toHaveLength(1);
    expect(result.choices[0].message.content).toBe('{"test":true}');
  });

  it("passes messages through to provider", async () => {
    const messages = [
      { role: "system" as const, content: "You are helpful." },
      { role: "user" as const, content: "Analyze this." },
    ];
    const result = await invokeLLM({ messages });
    expect(result.choices[0].message.role).toBe("assistant");
  });

  it("handles json_schema response_format option", async () => {
    const result = await invokeLLM({
      messages: [{ role: "user", content: "json please" }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "test_schema",
          strict: true,
          schema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"], additionalProperties: false },
        },
      },
    });
    expect(result.choices).toBeDefined();
  });
});
