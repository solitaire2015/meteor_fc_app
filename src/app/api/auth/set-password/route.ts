import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { adminSetPasswordSchema } from "@/lib/validations/auth";
import { CACHE_TAGS, invalidateCacheTags } from "@/lib/cache";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = adminSetPasswordSchema.parse(body);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);
    
    // Update user password
    await prisma.user.update({
      where: { id: validatedData.userId },
      data: {
        passwordHash: hashedPassword,
        accountStatus: 'CLAIMED'
      }
    });

    await invalidateCacheTags([
      CACHE_TAGS.PLAYERS,
      CACHE_TAGS.USERS,
      CACHE_TAGS.LEADERBOARD,
      CACHE_TAGS.STATS,
      CACHE_TAGS.STATISTICS
    ]);
    
    return NextResponse.json({ 
      message: "Password set successfully",
      userId: validatedData.userId 
    });
    
  } catch (error) {
    console.error("Set password error:", error);
    return NextResponse.json(
      { error: "Failed to set password" },
      { status: 500 }
    );
  }
}
