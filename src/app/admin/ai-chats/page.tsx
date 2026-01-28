"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ConversationListItem = {
  id: string;
  clientConversationId: string;
  user: { id: string; name: string; email: string | null } | null;
  agentType: string | null;
  page: string | null;
  matchId: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessage: { role: string; content: string; createdAt: string } | null;
};

type ConversationDetail = {
  id: string;
  clientConversationId: string;
  user: { id: string; name: string; email: string | null } | null;
  agentType: string | null;
  page: string | null;
  origin: string | null;
  matchId: string | null;
  createdAt: string;
  updatedAt: string;
  messages: Array<{ id: string; role: string; content: string; createdAt: string }>;
};

export default function AdminAiChatsPage() {
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/ai-chats", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load AI chats");
        if (!cancelled) setItems(json.data || []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    (async () => {
      try {
        setError(null);
        const res = await fetch(`/api/admin/ai-chats/${selectedId}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load conversation");
        if (!cancelled) setDetail(json.data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">AI 聊天记录</h1>
        <p className="text-sm text-muted-foreground">查看用户与 AI 助手的对话历史（最近 50 条会话）。</p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>会话列表</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              disabled={loading}
            >
              刷新
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                {loading ? "加载中..." : "暂无记录"}
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  className={`w-full text-left rounded-lg border p-3 hover:bg-muted/40 transition-colors ${
                    selectedId === item.id ? "border-primary" : ""
                  }`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {item.user?.name || "(未知用户)"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.page || ""}
                        {item.matchId ? ` • match:${item.matchId}` : ""}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {item.agentType ? <Badge variant="secondary">{item.agentType}</Badge> : null}
                    </div>
                  </div>
                  {item.lastMessage ? (
                    <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      <span className="mr-2">[{item.lastMessage.role}]</span>
                      {item.lastMessage.content}
                    </div>
                  ) : null}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>会话详情</CardTitle>
          </CardHeader>
          <CardContent>
            {!detail ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                选择左侧会话查看详情
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  {detail.user?.name || "(未知用户)"} • {detail.agentType} • {detail.page}
                </div>
                <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
                  {detail.messages.map((m) => (
                    <div key={m.id} className="rounded-md border p-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={m.role === "USER" ? "default" : "secondary"}>{m.role}</Badge>
                        <span className="text-[11px] text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm">{m.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
