import { JobTitle } from "../models/openaiJobTitle";
import { OpenAI } from "openai";
import { config } from "../config";
import { logger } from "../utils/logger";

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

export const openaiClient = {
  classifyJobTitles: async (jobTitles: string[]): Promise<JobTitle[]> => {
    logger.info(
      "Calling OpenAI API (Assistants) to classify job titles...",
      jobTitles
    );

    const assistantId = config.jobTitleAssistantId;

    if (!assistantId) {
      throw new Error(
        "Missing JOB_TITLE_ASSISTANT_ID in environment variables."
      );
    }

    const message = `Classify these job titles into department, function, and seniority:\n${jobTitles.join(
      "\n"
    )}`;

    const thread = await openai.beta.threads.create();

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });

    let runStatus = await openai.beta.threads.runs.retrieve(run.id, {
      thread_id: thread.id,
    });
    while (runStatus.status !== "completed") {  // TODO: ADD FAILURE HANDLING
      if (runStatus.status === "failed" || runStatus.status === "cancelled") {
        logger.error("Assistant run failed:", runStatus.last_error);
        break;
      }
      logger.info("Waiting for Assistant to finish...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      runStatus = await openai.beta.threads.runs.retrieve(run.id, {
        thread_id: thread.id,
      });
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const latestMessage = messages.data[0];

    const textContent = latestMessage.content.find(
      (content) => content.type === "text"
    );

    if (!textContent) {
      throw new Error("No text content found in assistant response.");
    }

    const result = JSON.parse(
      (textContent as { type: "text"; text: { value: string } }).text.value
    ) as JobTitle[];
    return result;
  },
};
