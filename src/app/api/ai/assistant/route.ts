import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAgentForType } from "@/lib/ai/agents";
import { assistantRequestSchema, patchEnvelopeSchema, type AgentType } from "@/lib/ai/schema";
import {
  isAIMessage,
  isAIMessageChunk,
  isToolMessage,
} from "@langchain/core/messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

const toSse = (event: string, data: unknown) =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

const extractText = (content: unknown) => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === "string") return block;
        if (block && typeof block === "object" && "text" in block) {
          return String((block as { text?: string }).text || "");
        }
        return "";
      })
      .join("");
  }
  return "";
};

const safeJsonParse = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const selectAgentType = (page: string): AgentType => {
  if (page.includes("admin/users")) {
    return "user_admin";
  }

  if (page.includes("admin/matches")) {
    return "match";
  }

  return "general";
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = assistantRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { context, messages } = parsed.data;
  const agentType = selectAgentType(context.page);
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (agentType !== "general" && session.user.userType !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  const agent = getAgentForType(agentType, context, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  const provider = process.env.AI_PROVIDER?.toLowerCase() || "openai";

  const aiMessageIdsWithChunks = new Set<string>();
  const streamedFullMessageIds = new Set<string>();
  const streamedToolMessageIds = new Set<string>();
  let emittedAny = false;

  const getMessageId = (message: unknown) => {
    if (!message || typeof message !== "object") return "";
    if ("id" in message && typeof message.id === "string") return message.id;
    if ("tool_call_id" in message && typeof message.tool_call_id === "string") {
      return `tool-${message.tool_call_id}`;
    }
    return "";
  };

  const readable = new ReadableStream({
    async start(controller) {
      const emitMessageText = async (text: string, chunked = false) => {
        if (!text) return;
        emittedAny = true;

        if (!chunked) {
          controller.enqueue(encoder.encode(toSse("message", { content: text })));
          return;
        }

        const chunkSize = 16;
        for (let i = 0; i < text.length; i += chunkSize) {
          const slice = text.slice(i, i + chunkSize);
          controller.enqueue(encoder.encode(toSse("message", { content: slice })));
          await new Promise(resolve => setTimeout(resolve, 12));
        }
      };

      const emitToolPatch = (message: unknown) => {
        const raw = extractText((message as { content?: unknown })?.content);
        const parsedTool = raw ? safeJsonParse(raw) : (message as { content?: unknown })?.content;
        const candidate = parsedTool || (message as { content?: unknown })?.content;
        const patch = patchEnvelopeSchema.safeParse(candidate);
        if (patch.success) {
          emittedAny = true;
          controller.enqueue(encoder.encode(toSse("tool_result", patch.data)));
        }
      };

      const handleMessage = async (message: unknown, chunked = false) => {
        if (!message) return;

        if (isToolMessage(message) || (message as { type?: string })?.type === "tool") {
          const toolId = getMessageId(message);
          if (toolId && streamedToolMessageIds.has(toolId)) return;
          if (toolId) streamedToolMessageIds.add(toolId);
          emitToolPatch(message);
          return;
        }

        if (isAIMessageChunk(message)) {
          if (message.id) aiMessageIdsWithChunks.add(message.id);
          const text = extractText(message.content);
          await emitMessageText(text, chunked);
          return;
        }

        if (isAIMessage(message) || (message as { type?: string })?.type === "ai") {
          const messageId = getMessageId(message);
          if (messageId && aiMessageIdsWithChunks.has(messageId)) return;
          if (messageId && streamedFullMessageIds.has(messageId)) return;
          if (messageId) streamedFullMessageIds.add(messageId);
          const text = extractText((message as { content?: unknown })?.content);
          await emitMessageText(text, chunked);
          return;
        }
      };

      try {
        if (provider === "google" || provider === "gemini") {
          const result = await agent.invoke({ messages });
          const resultMessages = Array.isArray((result as { messages?: unknown }).messages)
            ? ((result as { messages?: unknown }).messages as unknown[])
            : [];

          const newMessages = resultMessages.slice(messages.length);
          const messagesToEmit = newMessages.length
            ? newMessages
            : resultMessages.filter(message =>
                isAIMessage(message) || isToolMessage(message)
              ).slice(-1);

          for (const message of messagesToEmit) {
            await handleMessage(message, true);
          }
        } else {
          const stream = await agent.stream(
            { messages },
            { streamMode: ["messages", "values"] }
          );

          for await (const chunk of stream) {
            if (Array.isArray(chunk) && chunk.length >= 3) {
              const channel = chunk[1];
              const payload = chunk[2];

              if (channel === "messages" && Array.isArray(payload)) {
                const message = payload[0];
                if (message) await handleMessage(message);
                continue;
              }

              if ((channel === "values" || channel === "updates") && payload && typeof payload === "object") {
                const messagesValue = (payload as { messages?: unknown }).messages;
                if (Array.isArray(messagesValue)) {
                  const lastMessage = messagesValue[messagesValue.length - 1];
                  if (lastMessage) await handleMessage(lastMessage);
                }
                continue;
              }
            } else if (chunk && typeof chunk === "object" && "messages" in chunk) {
              const messagesValue = (chunk as { messages?: unknown }).messages;
              if (Array.isArray(messagesValue)) {
                const lastMessage = messagesValue[messagesValue.length - 1];
                if (lastMessage) await handleMessage(lastMessage);
              }
            }
          }
        }

        if (!emittedAny) {
          controller.enqueue(
            encoder.encode(
              toSse("message", { content: "抱歉，模型没有返回有效内容，请再试一次。" })
            )
          );
        }

        controller.enqueue(encoder.encode(toSse("done", { status: "ok" })));
        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            toSse("error", {
              message: error instanceof Error ? error.message : "AI stream error",
            })
          )
        );
        controller.close();
      }
    },
  });

  return new NextResponse(readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
