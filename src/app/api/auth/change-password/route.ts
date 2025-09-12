import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const prisma = new PrismaClient();

// API-specific validation schema (no confirmPassword needed since frontend validates)
const apiChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters")
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Validate input
    const validatedData = apiChangePasswordSchema.parse(body);
    
    // Find user by name (since that's what we store in session)
    const user = await prisma.user.findFirst({
      where: { name: session.user.name }
    });
    
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "User not found or no password set" },
        { status: 404 }
      );
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(
      validatedData.currentPassword,
      user.passwordHash
    );
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }
    
    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(validatedData.newPassword, saltRounds);
    
    // Update user password and mark as claimed
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        passwordHash: hashedPassword,
        accountStatus: 'CLAIMED' // Mark as claimed after password change
      }
    });
    
    return NextResponse.json({ 
      message: "Password changed successfully" 
    });
    
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}