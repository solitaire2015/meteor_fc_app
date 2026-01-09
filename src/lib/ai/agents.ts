import { createAgent } from "langchain";
import { getChatModel } from "./models";
import { buildSystemPrompt } from "./prompts";
import { type AgentType, type AssistantContext } from "./schema";
import {
  proposeMatchCreatePatch,
  proposeMatchInfoPatch,
  proposePlayerSelectionPatch,
  proposeAttendancePatch,
  proposeEventsPatch,
  proposeFeesPatch,
  proposeCreateUserAction,
  proposeUpdateUserAction,
  proposeDeleteUserAction,
  proposeRestoreUserAction,
  proposeSetPasswordAction,
  createReadOnlyTools,
} from "./tools";

export const getAgentForType = (
  agentType: AgentType,
  context: AssistantContext,
  options?: { headers?: HeadersInit }
) => {
  const model = getChatModel();
  const systemPrompt = buildSystemPrompt(agentType, context);
  const baseUrl =
    context.origin ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  switch (agentType) {
    case "match":
      return createAgent({
        model,
        tools: [
          proposeMatchCreatePatch,
          proposeMatchInfoPatch,
          proposePlayerSelectionPatch,
          proposeAttendancePatch,
          proposeEventsPatch,
          proposeFeesPatch,
        ],
        systemPrompt,
        name: "match-agent",
      });
    case "user_admin":
      return createAgent({
        model,
        tools: [
          proposeCreateUserAction,
          proposeUpdateUserAction,
          proposeDeleteUserAction,
          proposeRestoreUserAction,
          proposeSetPasswordAction,
        ],
        systemPrompt,
        name: "user-admin-agent",
      });
    case "general":
    default:
      return createAgent({
        model,
        tools: createReadOnlyTools(baseUrl, options?.headers),
        systemPrompt,
        name: "general-agent",
      });
  }
};
