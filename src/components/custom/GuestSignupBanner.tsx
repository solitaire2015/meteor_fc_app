"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

interface GuestSignupBannerProps {
  className?: string;
  buttonClassName?: string;
  buttonVariant?: ComponentProps<typeof Button>["variant"];
}

export default function GuestSignupBanner({
  className = "",
  buttonClassName = "",
  buttonVariant = "secondary",
}: GuestSignupBannerProps) {
  const { status } = useSession();

  if (status !== "unauthenticated") {
    return null;
  }

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="space-y-1">
        <div className="font-semibold">当前为游客浏览</div>
        <div className="text-xs sm:text-sm">
          登录后可使用 AI 助手和个人资料。没有账号请联系管理员创建。
        </div>
      </div>
      <Button asChild variant={buttonVariant} className={buttonClassName}>
        <Link href="/login">登录</Link>
      </Button>
    </div>
  );
}
