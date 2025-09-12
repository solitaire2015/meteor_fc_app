import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema
const playerQuerySchema = z.object({
  year: z.string().optional()
})

// GET /api/player/[id] - Get individual player data and statistics
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const query = playerQuerySchema.parse({
      year: searchParams.get('year') || undefined
    })

    const { id: playerId } = await params
    const currentYear = new Date().getFullYear()
    const targetYear = query.year ? parseInt(query.year) : currentYear

    // Get player basic info
    const player = await prisma.user.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        jerseyNumber: true,
        position: true,
        avatarUrl: true,
        createdAt: true
      }
    })

    if (!player) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'PLAYER_NOT_FOUND',
          message: 'Player not found'
        }
      }, { status: 404 })
    }

    // Build date filter for matches
    const dateFilter = {
      matchDate: {
        gte: new Date(`${targetYear}-01-01`),
        lte: new Date(`${targetYear}-12-31`)
      }
    }

    // Get player statistics for the year
    const playerEvents = await prisma.matchEvent.findMany({
      where: {
        playerId: playerId,
        match: dateFilter
      },
      include: {
        match: {
          select: {
            id: true,
            matchDate: true,
            opponentTeam: true,
            ourScore: true,
            opponentScore: true,
            matchResult: true
          }
        }
      },
      orderBy: {
        match: {
          matchDate: 'desc'
        }
      }
    })

    // Get player participation data
    const participations = await prisma.matchParticipation.findMany({
      where: {
        userId: playerId,
        match: dateFilter
      },
      include: {
        match: {
          select: {
            id: true,
            matchDate: true,
            opponentTeam: true,
            ourScore: true,
            opponentScore: true,
            matchResult: true
          }
        }
      },
      orderBy: {
        match: {
          matchDate: 'desc'
        }
      }
    })

    // Calculate statistics
    let goals = 0
    let assists = 0
    const matchEvents: any[] = []

    playerEvents.forEach(event => {
      if (event.eventType === 'GOAL' || event.eventType === 'PENALTY_GOAL') {
        goals++
      } else if (event.eventType === 'ASSIST') {
        assists++
      }
      
      matchEvents.push({
        type: event.eventType,
        matchDate: event.match.matchDate,
        opponent: event.match.opponentTeam,
        score: `${event.match.ourScore}-${event.match.opponentScore}`,
        result: event.match.matchResult
      })
    })

    const appearances = participations.length

    // Get latest match details
    const latestMatch = participations.length > 0 ? participations[0] : null
    let latestMatchInfo = null
    
    if (latestMatch) {
      latestMatchInfo = {
        date: latestMatch.match.matchDate,
        opponent: latestMatch.match.opponentTeam,
        ourScore: latestMatch.match.ourScore,
        opponentScore: latestMatch.match.opponentScore,
        result: latestMatch.match.matchResult,
        totalFee: latestMatch.totalFeeCalculated,
        attendance: latestMatch.attendanceData
      }
    }

    // Generate player abbreviation
    const abbreviation = generateAbbreviation(player.name)

    return NextResponse.json({
      success: true,
      data: {
        id: player.id,
        name: player.name,
        email: player.email,
        phone: player.phone,
        jerseyNumber: player.jerseyNumber,
        position: player.position,
        avatarUrl: player.avatarUrl,
        abbreviation,
        createdAt: player.createdAt,
        statistics: {
          goals,
          assists,
          appearances,
          year: targetYear
        },
        latestMatch: latestMatchInfo,
        recentEvents: matchEvents.slice(0, 5), // Last 5 events
        attendanceHistory: participations.map(p => ({
          matchId: p.match.id,
          matchDate: p.match.matchDate,
          opponent: p.match.opponentTeam,
          totalTime: p.totalTime,
          totalFee: p.totalFeeCalculated,
          isLateArrival: p.isLateArrival
        }))
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.errors
        }
      }, { status: 400 })
    }

    console.error('Error fetching player data:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch player data'
      }
    }, { status: 500 })
  }
}

// Helper function to generate player abbreviations
function generateAbbreviation(name: string): string {
  if (!name) return 'UK'
  
  // For Chinese names, take first character and last character
  if (name.length >= 2) {
    return (name.charAt(0) + name.charAt(name.length - 1)).toUpperCase()
  }
  
  // For single character names, repeat it
  if (name.length === 1) {
    return (name + name).toUpperCase()
  }
  
  // For English names, take first two characters
  return name.substring(0, 2).toUpperCase()
}