import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { WhereClause, LeaderboardPlayerStats, LeaderboardPlayer } from '@/types/common'
import { ApiResponse } from '@/lib/apiResponse'
import { buildCacheKey, CACHE_TAGS, getCachedJson, setCachedJson } from '@/lib/cache'

// Validation schema
const leaderboardQuerySchema = z.object({
  type: z.enum(['goals', 'assists']).default('goals'),
  year: z.string().optional(),
  month: z.string().optional(),
  limit: z.string().optional()
})

// GET /api/leaderboard - Get player leaderboard
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = leaderboardQuerySchema.parse({
      type: searchParams.get('type') || 'goals',
      year: searchParams.get('year') || undefined,
      month: searchParams.get('month') || undefined,
      limit: searchParams.get('limit') || undefined
    })

    const cacheKey = buildCacheKey(new URL(request.url), 'v2')
    const cached = await getCachedJson<ApiResponse>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const currentYear = new Date().getFullYear()
    const targetYear = query.year ? parseInt(query.year) : currentYear
    const limit = query.limit ? parseInt(query.limit) : 50

    // Build date filter for matches
    const dateFilter: WhereClause = {
      matchDate: {
        gte: new Date(`${targetYear}-01-01`),
        lte: new Date(`${targetYear}-12-31`)
      }
    }

    if (query.month) {
      const month = parseInt(query.month)
      dateFilter.matchDate = {
        gte: new Date(`${targetYear}-${month.toString().padStart(2, '0')}-01`),
        lte: new Date(targetYear, month, 0) // Last day of month
      }
    }

    const eventTypes = ['GOAL', 'PENALTY_GOAL', 'ASSIST'] as const

    // Get all events for the period with player info (exclude deleted users)
    const events = await prisma.matchEvent.findMany({
      where: {
        match: dateFilter,
        eventType: { in: eventTypes },
        player: {
          deletedAt: null, // Only include events from active players
          playerStatus: { not: 'TRIAL' } // Exclude trial players from rankings
        }
      },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            position: true,
            jerseyNumber: true
          }
        },
        match: {
          select: {
            id: true,
            matchDate: true,
            opponentTeam: true
          }
        }
      },
      orderBy: {
        match: {
          matchDate: 'desc'
        }
      }
    })

    // Aggregate stats by player
    const playerStats: Record<string, LeaderboardPlayerStats> = {}

    events.forEach(event => {
      const playerId = event.playerId
      const player = (event as any).player;
      if (!player) return;

      if (!playerStats[playerId]) {
        playerStats[playerId] = {
          id: playerId,
          name: player.name,
          email: player.email,
          avatarUrl: player.avatarUrl,
          position: player.position,
          jerseyNumber: player.jerseyNumber,
          playerStatus: player.playerStatus,
          goals: 0,
          assists: 0,
          matches: new Set(),
          lastMatchDate: null
        }
      }

      if (event.eventType === 'GOAL' || event.eventType === 'PENALTY_GOAL') {
        playerStats[playerId].goals++
      } else if (event.eventType === 'ASSIST') {
        playerStats[playerId].assists++
      }

      playerStats[playerId].matches.add(event.matchId)

      if (!playerStats[playerId].lastMatchDate ||
        (event as any).match.matchDate > playerStats[playerId].lastMatchDate) {
        playerStats[playerId].lastMatchDate = (event as any).match.matchDate
      }
    })

    const playerIds = Object.keys(playerStats)
    if (playerIds.length === 0) {
      const payload: ApiResponse = {
        success: true,
        data: {
          type: query.type,
          period: query.month ? `${targetYear}-${query.month.padStart(2, '0')}` : targetYear.toString(),
          players: [],
          totalPlayers: 0
        }
      }

      await setCachedJson({
        key: cacheKey,
        value: payload,
        tags: [CACHE_TAGS.LEADERBOARD]
      })

      return NextResponse.json(payload)
    }

    // Get participation data for appearances and last match date
    const participations = await prisma.matchParticipation.findMany({
      where: {
        userId: { in: playerIds },
        match: dateFilter,
        user: {
          deletedAt: null
        }
      },
      include: {
        match: {
          select: {
            id: true,
            matchDate: true
          }
        }
      },
      orderBy: {
        match: {
          matchDate: 'desc'
        }
      }
    })

    participations.forEach(participation => {
      const stats = playerStats[participation.userId]
      if (!stats) return

      stats.matches.add(participation.matchId)
      if (!stats.lastMatchDate || participation.match.matchDate > stats.lastMatchDate) {
        stats.lastMatchDate = participation.match.matchDate
      }
    })

    // Convert to array and sort
    const sortedPlayers = Object.values(playerStats)
      .filter(player => query.type === 'goals' ? player.goals > 0 : player.assists > 0)
      .map((player: LeaderboardPlayerStats) => ({
        ...player,
        matchesPlayed: player.matches.size,
        matches: undefined // Remove Set from response
      }))
      .sort((a: Omit<LeaderboardPlayerStats, 'matches'> & { matchesPlayed: number }, b: Omit<LeaderboardPlayerStats, 'matches'> & { matchesPlayed: number }) => {
        const aValue = query.type === 'goals' ? a.goals : a.assists
        const bValue = query.type === 'goals' ? b.goals : b.assists

        if (bValue === aValue) {
          // If tied, sort by other stat as tiebreaker
          const aTiebreaker = query.type === 'goals' ? a.assists : a.goals
          const bTiebreaker = query.type === 'goals' ? b.assists : b.goals

          if (bTiebreaker === aTiebreaker) {
            // If still tied, sort by matches played
            return b.matchesPlayed - a.matchesPlayed
          }
          return bTiebreaker - aTiebreaker
        }
        return bValue - aValue
      })
      .slice(0, limit)

    // Add rank and generate abbreviations  
    const rankedPlayers: LeaderboardPlayer[] = sortedPlayers.map((player, index: number) => ({
      rank: index + 1,
      id: player.id,
      name: player.name,
      abbreviation: generateAbbreviation(player.name),
      avatarUrl: player.avatarUrl,
      position: player.position,
      jerseyNumber: player.jerseyNumber,
      goals: player.goals,
      assists: player.assists,
      matchesPlayed: player.matchesPlayed,
      lastMatchDate: player.lastMatchDate
    }))

    const payload: ApiResponse = {
      success: true,
      data: {
        type: query.type,
        period: query.month ? `${targetYear}-${query.month.padStart(2, '0')}` : targetYear.toString(),
        players: rankedPlayers,
        totalPlayers: rankedPlayers.length
      }
    }

    await setCachedJson({
      key: cacheKey,
      value: payload,
      tags: [CACHE_TAGS.LEADERBOARD]
    })

    return NextResponse.json(payload)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.issues
        }
      }, { status: 400 })
    }

    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch leaderboard'
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
