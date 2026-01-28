import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.userType !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const conversations = await prisma.agentConversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      user: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { role: true, content: true, createdAt: true },
      },
    },
  });

  return NextResponse.json({
    success: true,
    data: conversations.map((conversation) => ({
      id: conversation.id,
      clientConversationId: conversation.clientConversationId,
      user: conversation.user,
      agentType: conversation.agentType,
      page: conversation.page,
      matchId: conversation.matchId,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      lastMessage: conversation.messages[0] ?? null,
    })),
  });
}
