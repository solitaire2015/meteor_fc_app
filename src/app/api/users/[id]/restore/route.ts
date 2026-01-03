import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { successResponse, errorResponse, validationError, notFoundError } from '@/lib/apiResponse'
import { IdParamSchema, RestoreUserSchema, validateRequest } from '@/lib/validationSchemas'
import { CACHE_TAGS, invalidateCacheTags } from '@/lib/cache'

const prisma = new PrismaClient()

// POST /api/users/[id]/restore - Restore deleted user
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paramValidation = validateRequest(IdParamSchema, params)
    if (!paramValidation.success) {
      return validationError(paramValidation.error, paramValidation.details)
    }

    const { id } = paramValidation.data
    const body = await request.json()
    const validation = validateRequest(RestoreUserSchema, body)

    if (!validation.success) {
      return validationError(validation.error, validation.details)
    }

    // Check if user exists and is deleted
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return notFoundError('User not found')
    }

    if (!existingUser.deletedAt) {
      return errorResponse('User is not deleted')
    }

    // Check if jersey number is still available (if user has one)
    if (existingUser.jerseyNumber) {
      const conflictUser = await prisma.user.findFirst({
        where: { 
          jerseyNumber: existingUser.jerseyNumber,
          id: { not: id },
          deletedAt: null // Only check active users
        }
      })
      
      if (conflictUser) {
        return errorResponse(`Jersey number ${existingUser.jerseyNumber} is now taken by another user`)
      }
    }

    // Restore user
    const restoredUser = await prisma.user.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedBy: null,
        deletionReason: null
      },
      select: {
        id: true,
        name: true,
        jerseyNumber: true,
        position: true,
        email: true,
        phone: true,
        userType: true,
        accountStatus: true,
        shortId: true,
        createdAt: true,
        updatedAt: true
      }
    })

    await invalidateCacheTags([
      CACHE_TAGS.USERS,
      CACHE_TAGS.PLAYERS,
      CACHE_TAGS.LEADERBOARD,
      CACHE_TAGS.STATS,
      CACHE_TAGS.STATISTICS
    ])

    return successResponse({ 
      message: 'User restored successfully',
      user: restoredUser
    })
  } catch (error) {
    console.error('Error restoring user:', error)
    return errorResponse('Failed to restore user')
  }
}
