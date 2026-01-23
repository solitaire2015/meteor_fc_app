import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { CACHE_TAGS, invalidateCacheTags } from '@/lib/cache'

// Validation schema for updating user
const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  shortId: z.string().max(10).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  userType: z.enum(['ADMIN', 'PLAYER']).optional(),
  accountStatus: z.enum(['GHOST', 'CLAIMED']).optional(),
  playerStatus: z.enum(['REGULAR', 'TRIAL', 'VACATION']).optional(),
  jerseyNumber: z.number().int().positive().optional().or(z.null()),
  position: z.enum([
    'GK',
    'CB', 'LB', 'RB', 'LWB', 'RWB',
    'DMF', 'CMF', 'AMF', 'LMF', 'RMF',
    'CF', 'ST', 'SS', 'LWF', 'RWF'
  ]).optional().or(z.null()),
  dominantFoot: z.enum(['LEFT', 'RIGHT', 'BOTH']).optional(),
  introduction: z.string().optional(),
  joinDate: z.string().datetime().optional(),
})

// PUT /api/players/[id] - Update a user
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Clean up empty string emails
    if (body.email === '') {
      body.email = null
    }

    const validatedData = updateUserSchema.parse(body)

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      }, { status: 404 })
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.shortId !== undefined && { shortId: validatedData.shortId }),
        ...(validatedData.email !== undefined && { email: validatedData.email }),
        ...(validatedData.phone !== undefined && { phone: validatedData.phone }),
        ...(validatedData.userType && { userType: validatedData.userType }),
        ...(validatedData.accountStatus && { accountStatus: validatedData.accountStatus }),
        ...(validatedData.playerStatus && { playerStatus: validatedData.playerStatus as any }),
        ...(validatedData.jerseyNumber !== undefined && { jerseyNumber: validatedData.jerseyNumber }),
        ...(validatedData.position !== undefined && { position: validatedData.position }),
        ...(validatedData.dominantFoot && { dominantFoot: validatedData.dominantFoot }),
        ...(validatedData.introduction !== undefined && { introduction: validatedData.introduction }),
        ...(validatedData.joinDate && { joinDate: new Date(validatedData.joinDate) }),
        updatedAt: new Date()
      }
    })

    await invalidateCacheTags([
      CACHE_TAGS.PLAYERS,
      CACHE_TAGS.USERS,
      CACHE_TAGS.LEADERBOARD,
      CACHE_TAGS.STATS,
      CACHE_TAGS.STATISTICS
    ])

    return NextResponse.json({
      success: true,
      data: updatedUser
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.issues
        }
      }, { status: 400 })
    }

    console.error('Error updating user:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update user'
      }
    }, { status: 500 })
  }
}

// DELETE /api/players/[id] - Delete a user (optional for future use)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      }, { status: 404 })
    }

    // Delete user
    await prisma.user.delete({
      where: { id }
    })

    await invalidateCacheTags([
      CACHE_TAGS.PLAYERS,
      CACHE_TAGS.USERS,
      CACHE_TAGS.LEADERBOARD,
      CACHE_TAGS.STATS,
      CACHE_TAGS.STATISTICS
    ])

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to delete user'
      }
    }, { status: 500 })
  }
}
