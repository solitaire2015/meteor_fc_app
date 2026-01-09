import { useCallback, useState } from "react";
import { type AssistantContext, type AssistantMessage, type PatchEnvelope } from "@/lib/ai/schema";

type StreamHandlers = {
  onMessage: (token: string) => void;
  onToolResult: (patch: PatchEnvelope) => void;
  onDone: () => void;
  onError: (message: string) => void;
};

const parseEventBlock = (block: string) => {
  const lines = block.split("\n");
  let event = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.replace("event:", "").trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.replace("data:", "").trim());
    }
  }

  let data: unknown = null;
  if (dataLines.length) {
    try {
      data = JSON.parse(dataLines.join("\n"));
    } catch {
      data = { content: dataLines.join("\n") };
    }
  }
  return { event, data };
};

export const useAssistantStream = () => {
  const [isStreaming, setIsStreaming] = useState(false);

  const startStream = useCallback(
    async (params: {
      context: AssistantContext;
      messages: AssistantMessage[];
      handlers: StreamHandlers;
    }) => {
      const { context, messages, handlers } = params;

      setIsStreaming(true);

      try {
        const response = await fetch("/api/ai/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context, messages }),
        });

        if (!response.ok || !response.body) {
          throw new Error("AI 服务不可用");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let boundaryIndex = buffer.indexOf("\n\n");
          while (boundaryIndex !== -1) {
            const block = buffer.slice(0, boundaryIndex).trim();
            buffer = buffer.slice(boundaryIndex + 2);
            if (block) {
              const { event, data } = parseEventBlock(block);
              if (event === "message" && data?.content) {
                handlers.onMessage(data.content);
              } else if (event === "tool_result" && data) {
                handlers.onToolResult(data as PatchEnvelope);
              } else if (event === "done") {
                handlers.onDone();
              } else if (event === "error") {
                handlers.onError(data?.message || "AI 出错了");
              }
            }
            boundaryIndex = buffer.indexOf("\n\n");
          }
        }
      } catch (error) {
        handlers.onError(error instanceof Error ? error.message : "AI 出错了");
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  return { isStreaming, startStream };
};
