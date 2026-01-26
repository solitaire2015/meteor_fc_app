import { NextRequest, NextResponse } from 'next/server'
import { Prisma, PrismaClient } from '@prisma/client'
import { ApiResponse, successResponse, errorResponse, validationError, notFoundError } from '@/lib/apiResponse'
import { IdParamSchema, UpdateUserSchema, DeleteUserSchema, RestoreUserSchema, validateRequest } from '@/lib/validationSchemas'
import { buildCacheKey, CACHE_TAGS, getCachedJson, invalidateCacheTags, setCachedJson } from '@/lib/cache'

const prisma = new PrismaClient()

// GET /api/users/[id] - Get user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paramValidation = validateRequest(IdParamSchema, params)
    if (!paramValidation.success) {
      return validationError(paramValidation.error, paramValidation.details)
    }

    const { id } = paramValidation.data
    const cacheKey = buildCacheKey(new URL(request.url))
    const cached = await getCachedJson<ApiResponse>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const user = await prisma.user.findUnique({
      where: { id },
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

    if (!user) {
      return notFoundError('User not found')
    }

    const payload: ApiResponse = {
      success: true,
      data: user
    }

    await setCachedJson({
      key: cacheKey,
      value: payload,
      tags: [CACHE_TAGS.USERS]
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Error fetching user:', error)
    return errorResponse('Failed to fetch user')
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(
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
    const validation = validateRequest(UpdateUserSchema, body)

    if (!validation.success) {
      return validationError(validation.error, validation.details)
    }

    const updateData = validation.data

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return notFoundError('User not found')
    }

    // Check for unique jersey number if being updated
    if (updateData.jerseyNumber && updateData.jerseyNumber !== existingUser.jerseyNumber) {
      const conflictUser = await prisma.user.findFirst({
        where: {
          jerseyNumber: updateData.jerseyNumber,
          id: { not: id }
        }
      })

      if (conflictUser) {
        return errorResponse('Jersey number already exists', 'DUPLICATE_ERROR', 409, {
          field: 'jerseyNumber',
          value: updateData.jerseyNumber
        })
      }
    }

    // Check for unique shortId if being updated
    if (updateData.shortId !== undefined && updateData.shortId !== existingUser.shortId) {
      // Note: shortId is optional+unique in schema, so allow null/empty values.
      // If client sends empty string, treat it as "clear".
      const normalizedShortId = updateData.shortId?.trim() || null

      if (normalizedShortId) {
        const conflictUser = await prisma.user.findFirst({
          where: {
            shortId: normalizedShortId,
            id: { not: id }
          }
        })

        if (conflictUser) {
          return errorResponse(`短ID "${normalizedShortId}" 已被使用，请选择其他值`, 'DUPLICATE_ERROR', 409, {
            field: 'shortId',
            value: normalizedShortId
          })
        }
      }

      // Mutate updateData to keep DB consistent with normalization
      ;(updateData as any).shortId = normalizedShortId
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
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

    return successResponse(updatedUser)
  } catch (error) {
    // Handle Prisma unique constraint violations (e.g., shortId)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[] | undefined
        const fieldName = target?.[0] || 'field'

        return errorResponse(`Duplicate value for ${fieldName}`, 'DUPLICATE_ERROR', 409, {
          field: fieldName
        })
      }
    }

    console.error('Error updating user:', error)
    return errorResponse('Failed to update user')
  }
}

// DELETE /api/users/[id] - Soft delete user
export async function DELETE(
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
    const validation = validateRequest(DeleteUserSchema, body)

    if (!validation.success) {
      return validationError(validation.error, validation.details)
    }

    const { deletionReason } = validation.data

    // Check if user exists and is not already deleted
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return notFoundError('User not found')
    }

    if (existingUser.deletedAt) {
      return errorResponse('User is already deleted')
    }

    // Soft delete user
    const deletedUser = await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: 'SYSTEM', // TODO: Replace with actual admin user ID when auth is implemented
        deletionReason: deletionReason || null
      },
      select: {
        id: true,
        name: true,
        deletedAt: true,
        deletedBy: true,
        deletionReason: true
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
      message: 'User deleted successfully',
      user: deletedUser
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return errorResponse('Failed to delete user')
  }
}
