import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

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
  feeCoefficient: z.number().min(0).default(0),
  notes: z.string().optional(),
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
  notes: z.string().optional()
})

// GET /api/games - Get all matches
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const limit = searchParams.get('limit')

    let where: any = {}
    
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
            user: true
          }
        },
        events: {
          include: {
            player: true
          }
        },
        videos: true,
        comments: {
          include: {
            user: true,
            replies: {
              include: {
                user: true
              }
            }
          },
          where: {
            parentCommentId: null,
            deletedAt: null
          }
        },
        createdByUser: true
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
        feeCoefficient: Number(match.feeCoefficient),
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

    return NextResponse.json({
      success: true,
      data: transformedMatches
    })
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

    // Create match with participations in a transaction
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
          feeCoefficient: validatedMatchData.feeCoefficient,
          notes: validatedMatchData.notes,
          createdBy: validatedMatchData.createdBy
        }
      })

      // Create participations if provided
      if (participations && Array.isArray(participations)) {
        for (const participation of participations) {
          const validatedParticipation = participationSchema.parse(participation)
          
          // Calculate totals
          const totalTime = 
            validatedParticipation.section1Part1 + validatedParticipation.section1Part2 + validatedParticipation.section1Part3 +
            validatedParticipation.section2Part1 + validatedParticipation.section2Part2 + validatedParticipation.section2Part3 +
            validatedParticipation.section3Part1 + validatedParticipation.section3Part2 + validatedParticipation.section3Part3

          const fieldFeeCalculated = validatedParticipation.isGoalkeeper ? 0 : totalTime * Number(validatedMatchData.feeCoefficient)
          const lateFee = validatedParticipation.isLate ? 10 : 0
          const videoFee = 0 // Will be set later when video is added
          const totalFeeCalculated = fieldFeeCalculated + lateFee + videoFee

          await tx.matchParticipation.create({
            data: {
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
        }
      }

      // Create events if provided
      if (events && Array.isArray(events)) {
        for (const event of events) {
          await tx.matchEvent.create({
            data: {
              matchId: newMatch.id,
              playerId: event.playerId,
              eventType: event.eventType,
              minute: event.minute,
              description: event.description,
              createdBy: validatedMatchData.createdBy
            }
          })
        }
      }

      return newMatch
    })

    // Fetch complete match data
    const completeMatch = await prisma.match.findUnique({
      where: { id: match.id },
      include: {
        participations: {
          include: {
            user: true
          }
        },
        events: {
          include: {
            player: true
          }
        },
        createdByUser: true
      }
    })

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