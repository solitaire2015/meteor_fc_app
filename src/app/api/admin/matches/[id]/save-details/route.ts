import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { calculatePlayerFees, type AttendanceData } from '@/lib/feeCalculation'
import { calculateCoefficient } from '@/lib/utils/coefficient'
import { CACHE_TAGS, invalidateCacheTags } from '@/lib/cache'

// Validation schemas for frontend data format
const attendanceDataSchema = z.object({
  userId: z.string(),
  section: z.number().min(1).max(3),
  part: z.number().min(1).max(3),
  value: z.number().min(0).max(1),
  isGoalkeeper: z.boolean().default(false),
  isLateArrival: z.boolean().default(false),
  goals: z.number().min(0).default(0),
  assists: z.number().min(0).default(0)
})

const saveDetailsSchema = z.object({
  attendance: z.array(attendanceDataSchema),
  totalParticipants: z.number().min(0),
  totalGoals: z.number().min(0),
  totalAssists: z.number().min(0),
  totalCalculatedFees: z.number().min(0)
})

// POST /api/admin/matches/[id]/save-details - Save detailed game data
// @deprecated - This endpoint is deprecated. Use the new focused endpoints:
// - PUT /api/admin/matches/[id]/info for match info updates
// - PUT /api/admin/matches/[id]/players for player selection  
// - PUT /api/admin/matches/[id]/attendance for attendance updates
// - PUT /api/admin/matches/[id]/fees for fee overrides
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params
    const body = await request.json()
    
    // Validate request body
    const validatedData = saveDetailsSchema.parse(body)
    
    // Check if match exists
    const match = await prisma.match.findUnique({
      where: { id: matchId }
    })
    
    if (!match) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MATCH_NOT_FOUND',
          message: 'Match not found'
        }
      }, { status: 404 })
    }

    // Transform attendance data to aggregate by player
    const playerMap = new Map()
    
    // Process each attendance record and aggregate by player
    for (const attendance of validatedData.attendance) {
      const playerId = attendance.userId
      
      if (!playerMap.has(playerId)) {
        playerMap.set(playerId, {
          userId: playerId,
          attendanceData: {
            attendance: {
              "1": {"1": 0, "2": 0, "3": 0},
              "2": {"1": 0, "2": 0, "3": 0},
              "3": {"1": 0, "2": 0, "3": 0}
            },
            goalkeeper: {
              "1": {"1": false, "2": false, "3": false},
              "2": {"1": false, "2": false, "3": false},
              "3": {"1": false, "2": false, "3": false}
            }
          },
          totalTime: 0,
          isLateArrival: false,
          goals: 0,
          assists: 0
        })
      }
      
      const player = playerMap.get(playerId)
      
      // Set attendance value in JSONb structure
      player.attendanceData.attendance[attendance.section.toString()][attendance.part.toString()] = attendance.value
      
      // Set goalkeeper status in JSONb structure
      if (attendance.isGoalkeeper) {
        player.attendanceData.goalkeeper[attendance.section.toString()][attendance.part.toString()] = true
      }
      
      player.totalTime += attendance.value
      
      // Set late arrival if any attendance record has it
      if (attendance.isLateArrival) {
        player.isLateArrival = true
      }
      
      // Aggregate goals and assists (taking max to avoid duplicates)
      player.goals = Math.max(player.goals, attendance.goals)
      player.assists = Math.max(player.assists, attendance.assists)
    }

    // Start transaction to save all data atomically
    const result = await prisma.$transaction(async (tx) => {
      // 1. Clear existing participation and events for this match
      await tx.matchParticipation.deleteMany({
        where: { matchId }
      })
      
      await tx.matchEvent.deleteMany({
        where: { matchId }
      })

      // 2. Calculate real-time coefficient based on total play time
      const totalPlayTime = Array.from(playerMap.values())
        .reduce((sum, player) => sum + player.totalTime, 0)
      
      const realTimeCoefficient = calculateCoefficient(
        Number(match.fieldFeeTotal),
        Number(match.waterFeeTotal),
        totalPlayTime
      )

      // 3. Save match participations
      const participations = Array.from(playerMap.values())
        .filter(player => player.totalTime > 0) // Only save participants who actually played
        .map(player => {
          // Use centralized fee calculation
          const fees = calculatePlayerFees({
            attendanceData: player.attendanceData,
            isLateArrival: player.isLateArrival,
            feeCoefficient: realTimeCoefficient
          })
          
          return {
            matchId,
            userId: player.userId,
            attendanceData: player.attendanceData,
            isLateArrival: player.isLateArrival,
            totalTime: fees.normalPlayerParts, // Use normal player time from centralized calculation
            fieldFeeCalculated: fees.fieldFee,
            lateFee: fees.lateFee,
            videoFee: fees.videoFee,
            totalFeeCalculated: fees.totalFee
          }
        })

      await tx.matchParticipation.createMany({
        data: participations
      })

      // 4. Save match events (goals and assists)
      const events = []
      
      // Use a default system user for automated events (or use the first player as creator)
      // In a real app, you'd get this from the authenticated user
      const defaultCreatorId = Array.from(playerMap.values())[0]?.userId || 'system'
      
      for (const player of playerMap.values()) {
        if (player.totalTime > 0) { // Only create events for players who participated
          // Add goal events
          for (let i = 0; i < player.goals; i++) {
            events.push({
              matchId,
              playerId: player.userId,
              eventType: 'GOAL' as const,
              minute: null, // Changed from eventTime to minute
              description: `Goal by player`,
              createdBy: defaultCreatorId // Added required field
            })
          }
          
          // Add assist events
          for (let i = 0; i < player.assists; i++) {
            events.push({
              matchId,
              playerId: player.userId,
              eventType: 'ASSIST' as const,
              minute: null, // Changed from eventTime to minute
              description: `Assist by player`,
              createdBy: defaultCreatorId // Added required field
            })
          }
        }
      }

      if (events.length > 0) {
        await tx.matchEvent.createMany({
          data: events
        })
      }

      // 4. Return basic match info (no need to fetch relations again)
      return {
        id: matchId,
        participationsCount: participations.length,
        eventsCount: events.length
      }
    })

    // Calculate summary statistics from the input data
    const participantsCount = result?.participationsCount || 0
    const eventsCount = result?.eventsCount || 0
    
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
      data: {
        message: 'Game details saved successfully',
        match: { id: result?.id },
        participantsCount,
        eventsCount,
        totalGoals: validatedData.totalGoals,
        totalAssists: validatedData.totalAssists,
        totalParticipants: validatedData.totalParticipants,
        totalCalculatedFees: validatedData.totalCalculatedFees
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues
        }
      }, { status: 400 })
    }

    console.error('Error saving game details:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to save game details'
      }
    }, { status: 500 })
  }
}

// GET /api/admin/matches/[id]/save-details - Get existing game details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params
    
    // Get match with participations and events
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        participations: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        events: {
          include: {
            player: {
              select: {
                id: true,
                name: true
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
          code: 'MATCH_NOT_FOUND',
          message: 'Match not found'
        }
      }, { status: 404 })
    }

    // Transform data for the frontend - convert to AttendanceData array format expected by AttendanceGrid
    const attendanceData = []
    
    // Get fee override notes instead of participation notes
    const feeOverrides = await prisma.feeOverride.findMany({
      where: { matchId },
      include: {
        player: {
          select: { id: true, name: true }
        }
      }
    })
    
    for (const p of match.participations) {
      // Count goals and assists for this player
      const playerEvents = match.events.filter(e => e.playerId === p.userId)
      const goals = playerEvents.filter(e => e.eventType === 'GOAL' || e.eventType === 'PENALTY_GOAL').length
      const assists = playerEvents.filter(e => e.eventType === 'ASSIST').length
      
      // Get fee override notes for this player
      const playerOverride = feeOverrides.find(override => override.playerId === p.userId)
      const playerNotes = playerOverride?.notes || undefined
      
      // Convert JSONb attendance data back to grid format
      const attendanceJson = p.attendanceData as AttendanceData | null
      
      for (let section = 1; section <= 3; section++) {
        for (let part = 1; part <= 3; part++) {
          const sectionStr = section.toString()
          const partStr = part.toString()
          
          const value = attendanceJson?.attendance?.[sectionStr]?.[partStr] || 0
          const isGoalkeeper = attendanceJson?.goalkeeper?.[sectionStr]?.[partStr] || false
          
          if (value > 0) {
            attendanceData.push({
              userId: p.userId,
              section,
              part,
              value,
              isGoalkeeper,
              isLateArrival: p.isLateArrival,
              goals: section === 1 && part === 1 ? goals : 0, // Only show goals/assists on first cell
              assists: section === 1 && part === 1 ? assists : 0,
              notes: playerNotes // Include notes from fee override
            })
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        match: {
          id: match.id,
          opponentTeam: match.opponentTeam,
          matchDate: match.matchDate,
          ourScore: match.ourScore,
          opponentScore: match.opponentScore
        },
        attendance: attendanceData
      }
    })

  } catch (error) {
    console.error('Error fetching game details:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch game details'
      }
    }, { status: 500 })
  }
}
