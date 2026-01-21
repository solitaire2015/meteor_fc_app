"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAssistantStream } from "@/hooks/useAssistantStream";
import { type AssistantContext, type PatchEnvelope } from "@/lib/ai/schema";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

interface AssistantWidgetProps {
  context: AssistantContext;
  onApplyPatch: (patch: PatchEnvelope) => Promise<void> | void;
  onAfterApplyAll?: (patches: PatchEnvelope[]) => Promise<void> | void;
}

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export default function AssistantWidget({ context, onApplyPatch, onAfterApplyAll }: AssistantWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [patches, setPatches] = useState<PatchEnvelope[]>([]);
  const [activeAssistantId, setActiveAssistantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const { isStreaming, startStream } = useAssistantStream();
  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    const roster = context.availableUsers?.length ? context.availableUsers : context.availablePlayers;
    roster?.forEach(item => {
      map.set(item.id, item.name);
    });
    return map;
  }, [context.availablePlayers, context.availableUsers]);

  const buildContextPayload = useCallback(
    () => ({
      ...context,
      origin:
        context.origin ??
        (typeof window !== "undefined" ? window.location.origin : undefined),
      now: new Date().toISOString(),
    }),
    [context]
  );

  const applyAllPatches = useCallback(async () => {
    if (isApplying || patches.length === 0) return;
    setIsApplying(true);
    setError(null);

    const remaining: PatchEnvelope[] = [];
    const applied: PatchEnvelope[] = [];
    let hadError = false;

    for (const patch of patches) {
      try {
        await onApplyPatch(patch);
        applied.push(patch);
      } catch (applyError) {
        remaining.push(patch);
        hadError = true;
        setError(applyError instanceof Error ? applyError.message : "应用失败，请重试。");
      }
    }

    setPatches(remaining);
    if (!hadError && applied.length > 0 && onAfterApplyAll) {
      try {
        await onAfterApplyAll(applied);
      } catch (applyError) {
        setError(applyError instanceof Error ? applyError.message : "自动提交失败，请重试。");
      }
    }
    setIsApplying(false);
  }, [isApplying, patches, onApplyPatch, onAfterApplyAll]);

  const clearAllPatches = useCallback(() => {
    setPatches([]);
  }, []);

  const rejectPatch = useCallback((index: number) => {
    setPatches(prev => prev.filter((_, itemIndex) => itemIndex !== index));
  }, []);

  const formatName = useCallback((id: string) => {
    return nameById.get(id) || id;
  }, [nameById]);
  const formatFeeValue = useCallback((value: unknown) => {
    if (value === undefined || value === null || value === "") return value;
    return Math.round(Number(value));
  }, []);

  const markdownComponents = useMemo(
    () => ({
      p: ({ children }: { children: ReactNode }) => (
        <p className="mt-2 leading-relaxed first:mt-0">{children}</p>
      ),
      strong: ({ children }: { children: ReactNode }) => (
        <strong className="font-semibold">{children}</strong>
      ),
      em: ({ children }: { children: ReactNode }) => (
        <em className="italic">{children}</em>
      ),
      ul: ({ children }: { children: ReactNode }) => (
        <ul className="list-disc space-y-1 pl-5">{children}</ul>
      ),
      ol: ({ children }: { children: ReactNode }) => (
        <ol className="list-decimal space-y-1 pl-5">{children}</ol>
      ),
      li: ({ children }: { children: ReactNode }) => (
        <li className="leading-relaxed">{children}</li>
      ),
      blockquote: ({ children }: { children: ReactNode }) => (
        <blockquote className="border-l-2 border-muted-foreground/40 pl-3 text-muted-foreground">
          {children}
        </blockquote>
      ),
      code: ({ children }: { children: ReactNode }) => (
        <code className="rounded bg-muted/60 px-1 py-0.5 font-mono text-xs">
          {children}
        </code>
      ),
      pre: ({ children }: { children: ReactNode }) => (
        <pre className="overflow-x-auto rounded-md bg-muted/60 p-2 text-xs">
          {children}
        </pre>
      ),
      a: ({ children, href }: { children: ReactNode; href?: string }) => (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-2"
        >
          {children}
        </a>
      ),
    }),
    []
  );

  const renderChangeDetails = useCallback(
    (change: PatchEnvelope["changes"][number]) => {
      if (change.type === "match_info") {
        const lines: string[] = [];
        if (change.data.opponentTeam !== undefined) {
          lines.push(`对手队伍: ${change.data.opponentTeam || "清空"}`);
        }
        if (change.data.matchDate !== undefined) {
          lines.push(`比赛日期: ${change.data.matchDate || "清空"}`);
        }
        if (change.data.matchTime !== undefined) {
          lines.push(`比赛时间: ${change.data.matchTime || "清空"}`);
        }
        if (change.data.ourScore !== undefined) {
          lines.push(`我方比分: ${change.data.ourScore ?? "清空"}`);
        }
        if (change.data.opponentScore !== undefined) {
          lines.push(`对方比分: ${change.data.opponentScore ?? "清空"}`);
        }
        if (change.data.fieldFeeTotal !== undefined) {
          lines.push(`场地费: ${formatFeeValue(change.data.fieldFeeTotal)}`);
        }
        if (change.data.waterFeeTotal !== undefined) {
          lines.push(`水费: ${formatFeeValue(change.data.waterFeeTotal)}`);
        }
        if (change.data.notes !== undefined) {
          lines.push(`备注: ${change.data.notes ?? "清空"}`);
        }
        return lines;
      }

      if (change.type === "player_selection") {
        const lines: string[] = [];
        if (change.data.addPlayerIds.length > 0) {
          lines.push(
            `新增球员: ${change.data.addPlayerIds.map(formatName).join("、")}`
          );
        }
        if (change.data.removePlayerIds.length > 0) {
          lines.push(
            `移除球员: ${change.data.removePlayerIds.map(formatName).join("、")}`
          );
        }
        return lines;
      }

      if (change.type === "attendance") {
        return change.data.updates.map(update => {
          const player = formatName(update.playerId);
          const details: string[] = [];

          if (update.section !== undefined && update.part !== undefined) {
            const valueLabel =
              update.value === 1
                ? "全程"
                : update.value === 0.5
                  ? "半程"
                  : update.value === 0
                    ? "缺席"
                    : update.value !== undefined
                      ? `值 ${update.value}`
                      : "未变";
            details.push(`第${update.section}节第${update.part}部分 ${valueLabel}`);
          }

          if (update.isGoalkeeper !== undefined) {
            details.push(`门将 ${update.isGoalkeeper ? "是" : "否"}`);
          }

          if (update.isLateArrival !== undefined) {
            details.push(`迟到 ${update.isLateArrival ? "是" : "否"}`);
          }

          return `${player}: ${details.join("，")}`;
        });
      }

      if (change.type === "events") {
        return change.data.updates.map(update => {
          const player = formatName(update.playerId);
          const details: string[] = [];
          if (update.goals !== undefined) details.push(`进球 ${update.goals}`);
          if (update.assists !== undefined) details.push(`助攻 ${update.assists}`);
          return `${player}: ${details.join("，") || "无变化"}`;
        });
      }

      if (change.type === "fees") {
        return change.data.overrides.map(override => {
          const player = formatName(override.playerId);
          const details = [
            override.fieldFee !== undefined ? `场地费 ${formatFeeValue(override.fieldFee)}` : null,
            override.videoFee !== undefined ? `视频费 ${formatFeeValue(override.videoFee)}` : null,
            override.lateFee !== undefined ? `迟到费 ${formatFeeValue(override.lateFee)}` : null,
            override.paymentNote ? `备注 ${override.paymentNote}` : null,
          ].filter(Boolean);
          return `${player}: ${details.join("，") || "无变化"}`;
        });
      }

      if (change.type === "user_action") {
        const { action, userId, data } = change.data;
        const labels: Record<string, string> = {
          name: "姓名",
          shortId: "短ID",
          email: "邮箱",
          phone: "手机号",
          userType: "用户类型",
          accountStatus: "账户状态",
          jerseyNumber: "球衣号",
          position: "位置",
          dominantFoot: "惯用脚",
          introduction: "简介",
          joinDate: "加入日期",
          deletionReason: "删除原因",
        };

        const formatValue = (key: string, value: unknown) => {
          if (value === undefined || value === null || value === "") return "清空";
          if (key === "userType") return value === "ADMIN" ? "管理员" : "球员";
          if (key === "accountStatus") return value === "CLAIMED" ? "已认领" : "幽灵";
          if (key === "dominantFoot") {
            if (value === "LEFT") return "左脚";
            if (value === "RIGHT") return "右脚";
            if (value === "BOTH") return "双脚";
          }
          return String(value);
        };

        const lines: string[] = [];
        const userLabel = userId ? formatName(userId) : "新用户";

        if (action === "create_user") {
          lines.push(`创建用户: ${data?.name || "未提供姓名"}`);
        } else if (action === "update_user") {
          lines.push(`更新用户: ${userLabel}`);
        } else if (action === "delete_user") {
          lines.push(`删除用户: ${userLabel}`);
        } else if (action === "restore_user") {
          lines.push(`恢复用户: ${userLabel}`);
        } else if (action === "set_password") {
          lines.push(`设置密码: ${userLabel}`);
          lines.push("密码: 已设置");
        }

        if (data && action !== "set_password") {
          const detailLines = Object.entries(labels)
            .map(([key, label]) => {
              if (!(key in data)) return null;
              const value = (data as Record<string, unknown>)[key];
              if (key === "password") return null;
              return `${label}: ${formatValue(key, value)}`;
            })
            .filter(Boolean) as string[];
          lines.push(...detailLines);
        }

        return lines;
      }

      return [];
    },
    [formatName]
  );

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: input.trim(),
    };
    const assistantId = createId();

    setMessages((prev) => [...prev, userMessage, { id: assistantId, role: "assistant", content: "" }]);
    setInput("");
    setError(null);
    setActiveAssistantId(assistantId);

    await startStream({
      context: buildContextPayload(),
      messages: [...messages, userMessage].map((message) => ({
        role: message.role,
        content: message.content,
      })),
      handlers: {
        onMessage: (token) => {
          setMessages((prev) =>
            prev.map((item) =>
              item.id === assistantId
                ? { ...item, content: `${item.content}${token}` }
                : item
            )
          );
        },
        onToolResult: (patch) => {
          setPatches((prev) => [patch, ...prev]);
        },
        onDone: () => {
          setActiveAssistantId(null);
        },
        onError: (message) => {
          setError(message);
          setActiveAssistantId(null);
        },
      },
    });
  }, [buildContextPayload, input, isStreaming, messages, startStream]);

  return (
    <>
      <Button
        className={cn(
          "fixed z-50 h-12 w-12 rounded-full shadow-lg",
          "bottom-[calc(env(safe-area-inset-bottom)+16px)] right-4"
        )}
        onClick={() => setOpen(true)}
        aria-label="打开AI助手"
      >
        <Sparkles className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="h-[85vh] rounded-t-2xl px-0 pb-[env(safe-area-inset-bottom)]"
        >
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b">
              <SheetTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI 表单助手
              </SheetTitle>
            </SheetHeader>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
              {messages.length === 0 && (
                <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                  试试告诉我：比如“帮我创建周六比赛，对手是流星队，场地费1100，水费50”。
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {message.role === "assistant" ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {message.content ||
                          (message.id === activeAssistantId && isStreaming ? "..." : "")}
                      </ReactMarkdown>
                    ) : (
                      <span>{message.content}</span>
                    )}
                  </div>
                </div>
              ))}

              {error && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>

            <div className="border-t px-4 py-3">
              {patches.length > 0 && (
                <div className="mb-3 rounded-xl border bg-muted/40 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">待应用变更</div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={clearAllPatches} disabled={isApplying}>
                        拒绝全部
                      </Button>
                      <Button size="sm" onClick={applyAllPatches} disabled={isApplying}>
                        {isApplying ? "应用中..." : "一键应用全部"}
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                    {patches.map((patch, patchIndex) => (
                      <div key={`${patch.summary}-${patch.target}-${patchIndex}`} className="rounded-lg border bg-background p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-medium">{patch.summary}</div>
                          <Button size="sm" variant="ghost" onClick={() => rejectPatch(patchIndex)} disabled={isApplying}>
                            拒绝
                          </Button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="secondary">{patch.target}</Badge>
                          {patch.changes.map((change, index) => (
                            <Badge key={`${patch.summary}-${change.type}-${index}`}>{change.type}</Badge>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {patch.changes.map((change, changeIndex) => {
                            const details = renderChangeDetails(change);
                            if (details.length === 0) return null;
                            return (
                              <ul key={`${patch.summary}-${change.type}-${changeIndex}`} className="mt-2 list-disc space-y-1 pl-4">
                                {details.map((line, lineIndex) => (
                                  <li key={`${patch.summary}-${change.type}-${changeIndex}-${lineIndex}`}>{line}</li>
                                ))}
                              </ul>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="描述你想填的内容..."
                  className="min-h-[44px] resize-none"
                  rows={2}
                />
                <Button onClick={handleSend} disabled={!input.trim() || isStreaming} className="h-11 px-4">
                  {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
