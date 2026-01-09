"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import AssistantWidget from "@/components/ai/AssistantWidget";
import { type PatchEnvelope } from "@/lib/ai/schema";

const shouldHideAssistant = (pathname: string) => {
  return pathname.startsWith("/admin") || pathname.startsWith("/api");
};

export default function GeneralAssistant() {
  const pathname = usePathname() ?? "";
  const { data: session, status } = useSession();

  const handleApplyPatch = useCallback(async (_patch: PatchEnvelope) => {
    // General assistant is read-only; ignore any patch responses.
  }, []);

  if (status === "loading") return null;
  if (!session?.user) return null;
  if (!pathname || shouldHideAssistant(pathname)) return null;

  return (
    <AssistantWidget
      context={{
        page: pathname,
        locale: "zh-CN",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }}
      onApplyPatch={handleApplyPatch}
    />
  );
}
