import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiAssistantId: process.env.OPENAI_ASSISTANT_ID || "",
};
