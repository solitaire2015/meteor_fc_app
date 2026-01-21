import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateCoefficient } from '@/lib/utils/coefficient'
import { ApiResponse } from '@/lib/apiResponse'
import { buildCacheKey, CACHE_TAGS, deleteCacheByPrefixes, deleteCacheKeys, getCachedJson, invalidateCacheTags, setCachedJson } from '@/lib/cache'

const roundFee = (value: number) => Math.round(value)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cacheKey = buildCacheKey(new URL(request.url))
    const cached = await getCachedJson<ApiResponse>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const match = await prisma.match.findUnique({
      where: {
        id,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
          }
        },
        participations: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                jerseyNumber: true,
                position: true,
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
                jerseyNumber: true,
              }
            }
          }
        }
      }
    })

    if (!match) {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Match not found'
        }
      }, { status: 404 })
    }

    // Calculate statistics from events
    const goals = match.events.filter(e => e.eventType === 'GOAL').length
    const assists = match.events.filter(e => e.eventType === 'ASSIST').length
    const participants = match.participations.length

    // Calculate total play time from participations
    const totalPlayTime = match.participations.reduce((sum, p) => sum + Number(p.totalTime), 0)

    // Calculate coefficient and fees
    const coefficient = calculateCoefficient(
      Number(match.fieldFeeTotal),
      Number(match.waterFeeTotal),
      totalPlayTime
    )

    const totalCalculatedFees = roundFee(
      match.participations.reduce((sum, p) => sum + Number(p.totalFeeCalculated), 0)
    )

    const matchData = {
      ...match,
      totalParticipants: participants,
      totalGoals: goals,
      totalAssists: assists,
      totalCalculatedFees,
      calculatedCoefficient: coefficient, // Add calculated coefficient for display
    }

    const payload: ApiResponse = {
      success: true,
      data: matchData
    }

    await setCachedJson({
      key: cacheKey,
      value: payload,
      tags: [CACHE_TAGS.GAMES]
    })

    return NextResponse.json(payload)

  } catch (error) {
    console.error('Error fetching match:', error)
    return NextResponse.json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const roundedBody = {
      ...body,
      fieldFeeTotal: body.fieldFeeTotal !== undefined
        ? roundFee(Number(body.fieldFeeTotal))
        : body.fieldFeeTotal,
      waterFeeTotal: body.waterFeeTotal !== undefined
        ? roundFee(Number(body.waterFeeTotal))
        : body.waterFeeTotal
    }

    const updatedMatch = await prisma.match.update({
      where: {
        id,
      },
      data: {
        ...roundedBody,
        updatedAt: new Date(),
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    const cacheTasks = [
      invalidateCacheTags([
        CACHE_TAGS.MATCHES,
        CACHE_TAGS.GAMES,
        CACHE_TAGS.PLAYERS,
        CACHE_TAGS.LEADERBOARD,
        CACHE_TAGS.STATS,
        CACHE_TAGS.STATISTICS
      ]),
      deleteCacheKeys([buildCacheKey(new URL('/api/games', request.url))]),
      deleteCacheByPrefixes([
        `${buildCacheKey(new URL('/api/games', request.url))}`,
        `${buildCacheKey(new URL('/api/matches', request.url))}`
      ])
    ]
    void Promise.all(cacheTasks).catch((cacheError) => {
      console.warn('Cache invalidation failed after match update:', cacheError)
    })

    return NextResponse.json({
      success: true,
      data: updatedMatch
    })

  } catch (error) {
    console.error('Error updating match:', error)
    return NextResponse.json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let matchId = ''
  try {
    const { id } = await params
    matchId = id
    await prisma.$transaction(async (tx) => {
      await tx.comment.deleteMany({
        where: { matchId: id, parentCommentId: { not: null } }
      })

      await tx.comment.deleteMany({
        where: { matchId: id }
      })

      await tx.video.deleteMany({
        where: { matchId: id }
      })

      await tx.matchPlayer.deleteMany({
        where: { matchId: id }
      })

      await tx.feeOverride.deleteMany({
        where: { matchId: id }
      })

      await tx.matchEvent.deleteMany({
        where: { matchId: id }
      })

      await tx.matchParticipation.deleteMany({
        where: { matchId: id }
      })

      await tx.match.delete({
        where: { id }
      })
    })

    const cacheTasks = [
      invalidateCacheTags([
        CACHE_TAGS.MATCHES,
        CACHE_TAGS.GAMES,
        CACHE_TAGS.PLAYERS,
        CACHE_TAGS.LEADERBOARD,
        CACHE_TAGS.STATS,
        CACHE_TAGS.STATISTICS
      ]),
      deleteCacheKeys([buildCacheKey(new URL('/api/games', request.url))]),
      deleteCacheByPrefixes([
        `${buildCacheKey(new URL('/api/games', request.url))}`,
        `${buildCacheKey(new URL('/api/matches', request.url))}`
      ])
    ]
    void Promise.all(cacheTasks).catch((cacheError) => {
      console.warn('Cache invalidation failed after match delete:', cacheError)
    })

    return NextResponse.json({
      success: true,
      message: 'Match deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting match:', error)
    if (matchId) {
      const existingMatch = await prisma.match.findUnique({
        where: { id: matchId }
      })
      if (!existingMatch) {
        return NextResponse.json({
          success: true,
          message: 'Match deleted successfully'
        })
      }
    }
    return NextResponse.json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    }, { status: 500 })
  }
}
