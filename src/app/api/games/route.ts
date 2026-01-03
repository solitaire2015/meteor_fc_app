import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { WhereClause } from '@/types/common'
import { z } from 'zod'
import { globalSettingsService } from '@/lib/services/globalSettingsService'
import { ApiResponse } from '@/lib/apiResponse'
import { buildCacheKey, CACHE_TAGS, getCachedJson, invalidateCacheTags, setCachedJson } from '@/lib/cache'

// Validation schemas
const createMatchSchema = z.object({
  matchDate: z.string().datetime(),
  matchTime: z.string().datetime().optional(),
  opponentTeam: z.string().min(1, 'Opponent team is required'),
  ourScore: z.number().int().min(0).optional(),
  opponentScore: z.number().int().min(0).optional(),
  matchResult: z.enum(['WIN', 'LOSE', 'DRAW']).optional(),
  fieldFeeTotal: z.number().min(0).default(0),
  waterFeeTotal: z.number().min(0).default(0),
  notes: z.string().nullable().optional(),
  createdBy: z.string().min(1, 'Creator ID is required')
})

const participationSchema = z.object({
  userId: z.string().min(1),
  section1Part1: z.number().min(0).max(1).default(0),
  section1Part2: z.number().min(0).max(1).default(0),
  section1Part3: z.number().min(0).max(1).default(0),
  section2Part1: z.number().min(0).max(1).default(0),
  section2Part2: z.number().min(0).max(1).default(0),
  section2Part3: z.number().min(0).max(1).default(0),
  section3Part1: z.number().min(0).max(1).default(0),
  section3Part2: z.number().min(0).max(1).default(0),
  section3Part3: z.number().min(0).max(1).default(0),
  isGoalkeeper: z.boolean().default(false),
  isLate: z.boolean().default(false),
  paymentProxy: z.string().optional(),
  notes: z.string().nullable().optional()
})

// GET /api/games - Get all matches
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const limit = searchParams.get('limit')

    const cacheKey = buildCacheKey(new URL(request.url))
    const cached = await getCachedJson<ApiResponse>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const where: WhereClause = {}
    
    if (year) {
      const startDate = new Date(`${year}-01-01`)
      const endDate = new Date(`${year}-12-31`)
      where.matchDate = {
        gte: startDate,
        lte: endDate
      }
      
      if (month) {
        const monthStart = new Date(`${year}-${month.padStart(2, '0')}-01`)
        const monthEnd = new Date(parseInt(year), parseInt(month), 0) // Last day of month
        where.matchDate = {
          gte: monthStart,
          lte: monthEnd
        }
      }
    }

    const matches = await prisma.match.findMany({
      where,
      orderBy: {
        matchDate: 'desc'
      },
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
          }
        },
        videos: true,
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true
              }
            },
            replies: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatarUrl: true
                  }
                }
              }
            }
          },
          where: {
            parentCommentId: null,
            deletedAt: null
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true
          }
        }
      },
      take: limit ? parseInt(limit) : undefined
    })

    // Transform matches to include calculated statistics
    const transformedMatches = matches.map(match => {
      // Calculate match statistics
      const totalParticipants = match.participations.length
      const goalEvents = match.events.filter(e => e.eventType === 'GOAL' || e.eventType === 'PENALTY_GOAL')
      const assistEvents = match.events.filter(e => e.eventType === 'ASSIST')
      
      // Calculate total fees
      const totalCalculatedFees = match.participations.reduce((sum, p) => 
        sum + Number(p.totalFeeCalculated), 0
      )

      return {
        id: match.id,
        matchDate: match.matchDate,
        matchTime: match.matchTime,
        opponentTeam: match.opponentTeam,
        ourScore: match.ourScore,
        opponentScore: match.opponentScore,
        matchResult: match.matchResult,
        fieldFeeTotal: Number(match.fieldFeeTotal),
        waterFeeTotal: Number(match.waterFeeTotal),
        notes: match.notes,
        createdAt: match.createdAt,
        updatedAt: match.updatedAt,
        createdBy: match.createdBy,
        createdByUser: match.createdByUser,
        // Statistics
        totalParticipants,
        totalGoals: goalEvents.length,
        totalAssists: assistEvents.length,
        totalCalculatedFees: Number(totalCalculatedFees.toFixed(2)),
        // Related data counts
        participationsCount: match.participations.length,
        eventsCount: match.events.length,
        videosCount: match.videos.length,
        commentsCount: match.comments.length,
        // For frontend compatibility
        date: match.matchDate.toISOString().split('T')[0].replace('-', '月').replace('-', '日').replace(/^\d{4}/, (year) => `${parseInt(year) - 2000}年`),
        opponent: match.opponentTeam,
        result: match.matchResult || 'TBD',
        status: (match.ourScore !== null && match.opponentScore !== null) ? '已结束' : '即将开始'
      }
    })

    const payload = {
      success: true,
      data: transformedMatches
    }

    await setCachedJson({
      key: cacheKey,
      value: payload,
      tags: [CACHE_TAGS.GAMES]
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Error fetching matches:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch matches'
      }
    }, { status: 500 })
  }
}

// POST /api/games - Create a new match
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { participations, events, ...matchData } = body
    
    const validatedMatchData = createMatchSchema.parse(matchData)

    // Read global base fee rates before creating match (outside transaction)
    const { baseVideoFeeRate, baseLateFeeRate } = await globalSettingsService.getBaseFeeRates()

    // Create match with participations in a transaction with timeout
    const match = await prisma.$transaction(async (tx) => {
      // Create the match
      const newMatch = await tx.match.create({
        data: {
          matchDate: new Date(validatedMatchData.matchDate),
          matchTime: validatedMatchData.matchTime ? new Date(validatedMatchData.matchTime) : null,
          opponentTeam: validatedMatchData.opponentTeam,
          ourScore: validatedMatchData.ourScore,
          opponentScore: validatedMatchData.opponentScore,
          matchResult: validatedMatchData.matchResult,
          fieldFeeTotal: validatedMatchData.fieldFeeTotal,
          waterFeeTotal: validatedMatchData.waterFeeTotal,
          lateFeeRate: baseLateFeeRate,
          videoFeePerUnit: baseVideoFeeRate,
          notes: validatedMatchData.notes,
          createdBy: validatedMatchData.createdBy
        }
      })

      // Create participations in batch if provided
      if (participations && Array.isArray(participations)) {
        const participationData = participations.map(participation => {
          const validatedParticipation = participationSchema.parse(participation)
          
          // Calculate totals
          const totalTime = 
            validatedParticipation.section1Part1 + validatedParticipation.section1Part2 + validatedParticipation.section1Part3 +
            validatedParticipation.section2Part1 + validatedParticipation.section2Part2 + validatedParticipation.section2Part3 +
            validatedParticipation.section3Part1 + validatedParticipation.section3Part2 + validatedParticipation.section3Part3

          const fieldFeeCalculated = validatedParticipation.isGoalkeeper ? 0 : totalTime * Number(validatedMatchData.feeCoefficient)
          const lateFee = validatedParticipation.isLate ? baseLateFeeRate : 0
          const videoFee = 0 // Will be set later when video is added
          const totalFeeCalculated = fieldFeeCalculated + lateFee + videoFee

          return {
            userId: validatedParticipation.userId,
            matchId: newMatch.id,
            section1Part1: validatedParticipation.section1Part1,
            section1Part2: validatedParticipation.section1Part2,
            section1Part3: validatedParticipation.section1Part3,
            section2Part1: validatedParticipation.section2Part1,
            section2Part2: validatedParticipation.section2Part2,
            section2Part3: validatedParticipation.section2Part3,
            section3Part1: validatedParticipation.section3Part1,
            section3Part2: validatedParticipation.section3Part2,
            section3Part3: validatedParticipation.section3Part3,
            isGoalkeeper: validatedParticipation.isGoalkeeper,
            totalTime,
            fieldFeeCalculated,
            isLate: validatedParticipation.isLate,
            lateFee,
            videoFee,
            totalFeeCalculated,
            paymentProxy: validatedParticipation.paymentProxy,
            notes: validatedParticipation.notes
          }
        })

        // Create all participations in batch
        await tx.matchParticipation.createMany({
          data: participationData
        })
      }

      // Create events in batch if provided
      if (events && Array.isArray(events)) {
        const eventData = events.map(event => ({
          matchId: newMatch.id,
          playerId: event.playerId,
          eventType: event.eventType,
          minute: event.minute,
          description: event.description,
          createdBy: validatedMatchData.createdBy
        }))

        await tx.matchEvent.createMany({
          data: eventData
        })
      }

      return newMatch
    }, {
      maxWait: 5000, // 5 seconds max wait to acquire a transaction
      timeout: 10000 // 10 seconds max transaction time
    })

    // Fetch complete match data
    const completeMatch = await prisma.match.findUnique({
      where: { id: match.id },
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
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true
          }
        }
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

    return NextResponse.json({
      success: true,
      data: completeMatch
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors
        }
      }, { status: 400 })
    }

    console.error('Error creating match:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to create match'
      }
    }, { status: 500 })
  }
}
