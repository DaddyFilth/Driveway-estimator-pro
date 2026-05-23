import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env", quiet: true });
loadEnv({ path: ".env.local", override: true, quiet: true });

//  CRIT-01: Fail fast on missing / weak JWT_SECRET
const jwtSecret = process.env.JWT_SECRET?.trim() ?? "";
if (jwtSecret.length < 32) {
  throw new Error(
    "[Startup] JWT_SECRET must be set to a random string of at least 32 characters. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  );
}

//  CRIT-04: Require DATABASE_URL in production 
if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
    throw new Error("[Startup] DATABASE_URL must be set in production.");
}

const defaultLlmModel = process.env.OPENAI_API_KEY
  ? "gpt-5-mini"
  : "gemini-2.5-flash";

export const ENV = {
  sessionAppId: process.env.APP_ID ?? "easy-asphalt",
  /** Never empty — validated above */
  cookieSecret: jwtSecret,
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  ownerEmail: process.env.OWNER_EMAIL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  openApiBaseUrl: process.env.OPENAPI_BASE_URL ?? "",
  openApiApiKey: process.env.OPENAPI_API_KEY ?? "",
  openApiDataApiPath: process.env.OPENAPI_DATA_API_PATH ?? "/data/execute",
  openApiLlmPath: process.env.OPENAPI_LLM_PATH ?? "/llm/chat/completions",
  openApiStoragePresignPutPath:
    process.env.OPENAPI_STORAGE_PRESIGN_PUT_PATH ?? "/storage/presign/put",
  openApiStoragePresignGetPath:
    process.env.OPENAPI_STORAGE_PRESIGN_GET_PATH ?? "/storage/presign/get",
  openAiBaseUrl: process.env.OPENAI_BASE_URL ?? "",
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  openAiChatCompletionsPath:
    process.env.OPENAI_CHAT_COMPLETIONS_PATH ?? "/chat/completions",
  openAiImageModel: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
  openAiTranscriptionModel:
    process.env.OPENAI_TRANSCRIPTION_MODEL ?? "whisper-1",
  forgeApiUrl:
    process.env.BUILT_IN_FORGE_API_URL ?? process.env.FORGE_API_URL ?? "",
  forgeApiKey:
    process.env.BUILT_IN_FORGE_API_KEY ?? process.env.FORGE_API_KEY ?? "",
  appBaseUrl: process.env.APP_BASE_URL ?? "",
  //  HIGH-08: configurable LLM model
  llmModel: process.env.LLM_MODEL ?? defaultLlmModel,
  llmMaxTokens: parseInt(process.env.LLM_MAX_TOKENS ?? "4096", 10),
  llmThinkingEnabled: process.env.LLM_THINKING_ENABLED === "true",
  llmThinkingBudget: parseInt(process.env.LLM_THINKING_BUDGET ?? "128", 10),
  //  CRIT-02: Resend email config
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFromAddress:
    process.env.EMAIL_FROM_ADDRESS ?? "noreply@drivewayestimatorpro.com",
};
