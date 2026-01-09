import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";

export const getChatModel = (options?: { temperature?: number }) => {
  const provider = process.env.AI_PROVIDER?.toLowerCase() || "openai";
  const modelName = process.env.AI_MODEL || DEFAULT_OPENAI_MODEL;
  const temperature = options?.temperature ?? 0.2;

  if (provider === "google" || provider === "gemini") {
    return new ChatGoogleGenerativeAI({
      model: modelName || DEFAULT_GEMINI_MODEL,
      temperature,
    });
  }

  return new ChatOpenAI({
    model: modelName,
    temperature,
  });
};

export const getRouterModel = () => {
  const provider = process.env.AI_PROVIDER?.toLowerCase() || "openai";
  const routerModel = process.env.AI_ROUTER_MODEL;
  const temperature = 0;

  if (provider === "google" || provider === "gemini") {
    return new ChatGoogleGenerativeAI({
      model: routerModel || DEFAULT_GEMINI_MODEL,
      temperature,
    });
  }

  return new ChatOpenAI({
    model: routerModel || DEFAULT_OPENAI_MODEL,
    temperature,
  });
};

