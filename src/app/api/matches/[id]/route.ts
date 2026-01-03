import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { ApiResponse, successResponse, errorResponse, validationError, notFoundError } from '@/lib/apiResponse'
import { IdParamSchema, UpdateMatchSchema, validateRequest } from '@/lib/validationSchemas'
import { buildCacheKey, CACHE_TAGS, getCachedJson, invalidateCacheTags, setCachedJson } from '@/lib/cache'

const prisma = new PrismaClient()

// GET /api/matches/[id] - Get match by ID with related data
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

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        participations: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                jerseyNumber: true,
                position: true,
                shortId: true
              }
            }
          }
        },
        events: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                jerseyNumber: true
              }
            }
          },
          orderBy: { minute: 'asc' }
        }
      }
    })

    if (!match) {
      return notFoundError('Match not found')
    }

    const payload: ApiResponse = {
      success: true,
      data: match
    }

    await setCachedJson({
      key: cacheKey,
      value: payload,
      tags: [CACHE_TAGS.MATCHES]
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Error fetching match:', error)
    return errorResponse('Failed to fetch match')
  }
}

// PUT /api/matches/[id] - Update match
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
    const validation = validateRequest(UpdateMatchSchema, body)

    if (!validation.success) {
      return validationError(validation.error, validation.details)
    }

    const updateData = validation.data

    // Check if match exists
    const existingMatch = await prisma.match.findUnique({
      where: { id }
    })

    if (!existingMatch) {
      return notFoundError('Match not found')
    }

    // Determine match result if scores are provided
    let matchResult = existingMatch.matchResult
    if (updateData.ourScore !== undefined && updateData.opponentScore !== undefined) {
      if (updateData.ourScore > updateData.opponentScore) {
        matchResult = 'WIN'
      } else if (updateData.ourScore < updateData.opponentScore) {
        matchResult = 'LOSE'
      } else {
        matchResult = 'DRAW'
      }
    }

    // Update match
    const updatedMatch = await prisma.match.update({
      where: { id },
      data: {
        ...updateData,
        matchResult
      },
      select: {
        id: true,
        matchDate: true,
        matchTime: true,
        opponentTeam: true,
        ourScore: true,
        opponentScore: true,
        matchResult: true,
        fieldFeeTotal: true,
        waterFeeTotal: true,
        notes: true,
        totalParticipants: true,
        totalGoals: true,
        totalAssists: true,
        totalCalculatedFees: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    })

    await invalidateCacheTags([
      CACHE_TAGS.MATCHES,
      CACHE_TAGS.GAMES,
      CACHE_TAGS.PLAYERS,
      CACHE_TAGS.LEADERBOARD,
      CACHE_TAGS.STATS,
      CACHE_TAGS.STATISTICS
    ])

    return successResponse(updatedMatch)
  } catch (error) {
    console.error('Error updating match:', error)
    return errorResponse('Failed to update match')
  }
}

// DELETE /api/matches/[id] - Delete match
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

    // Check if match exists
    const existingMatch = await prisma.match.findUnique({
      where: { id }
    })

    if (!existingMatch) {
      return notFoundError('Match not found')
    }

    // Delete match and related data in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete match events
      await tx.matchEvent.deleteMany({
        where: { matchId: id }
      })

      // Delete match participations
      await tx.matchParticipation.deleteMany({
        where: { matchId: id }
      })

      // Delete the match
      await tx.match.delete({
        where: { id }
      })
    })

    await invalidateCacheTags([
      CACHE_TAGS.MATCHES,
      CACHE_TAGS.GAMES,
      CACHE_TAGS.PLAYERS,
      CACHE_TAGS.LEADERBOARD,
      CACHE_TAGS.STATS,
      CACHE_TAGS.STATISTICS
    ])

    return successResponse({ message: 'Match deleted successfully' })
  } catch (error) {
    console.error('Error deleting match:', error)
    return errorResponse('Failed to delete match')
  }
}
