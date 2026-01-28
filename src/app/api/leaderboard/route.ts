import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { WhereClause, LeaderboardPlayerStats, LeaderboardPlayer } from '@/types/common'
import { ApiResponse } from '@/lib/apiResponse'
import { buildCacheKey, CACHE_TAGS, getCachedJson, setCachedJson } from '@/lib/cache'

// Validation schema
const leaderboardQuerySchema = z.object({
  type: z.enum(['goals', 'assists', 'yellow_cards', 'red_cards', 'penalty_goals', 'penalty_misses', 'own_goals', 'saves']).default('goals'),
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

    const cacheKey = buildCacheKey(new URL(request.url), 'v2.1') // Bump version
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

    const eventTypes = ['GOAL', 'PENALTY_GOAL', 'ASSIST', 'YELLOW_CARD', 'RED_CARD', 'PENALTY_MISS', 'OWN_GOAL', 'SAVE'] as const

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
            jerseyNumber: true,
            playerStatus: true
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
          yellowCards: 0,
          redCards: 0,
          penaltyGoals: 0,
          penaltyMisses: 0,
          ownGoals: 0,
          saves: 0,
          matches: new Set(),
          lastMatchDate: null
        }
      }

      // Update stats based on event type
      switch (event.eventType) {
        case 'GOAL':
          playerStats[playerId].goals++
          break
        case 'PENALTY_GOAL':
          playerStats[playerId].goals++
          playerStats[playerId].penaltyGoals++
          break
        case 'ASSIST':
          playerStats[playerId].assists++
          break
        case 'YELLOW_CARD':
          playerStats[playerId].yellowCards++
          break
        case 'RED_CARD':
          playerStats[playerId].redCards++
          break
        case 'PENALTY_MISS':
          playerStats[playerId].penaltyMisses++
          break
        case 'OWN_GOAL':
          playerStats[playerId].ownGoals++
          break
        case 'SAVE':
          playerStats[playerId].saves++
          break
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
      .filter(player => {
        if (query.type === 'goals') return player.goals > 0
        if (query.type === 'assists') return player.assists > 0
        if (query.type === 'yellow_cards') return player.yellowCards > 0
        if (query.type === 'red_cards') return player.redCards > 0
        if (query.type === 'penalty_goals') return player.penaltyGoals > 0
        if (query.type === 'penalty_misses') return player.penaltyMisses > 0
        if (query.type === 'own_goals') return player.ownGoals > 0
        if (query.type === 'saves') return player.saves > 0
        return false
      })
      .map((player: LeaderboardPlayerStats) => ({
        ...player,
        matchesPlayed: player.matches.size,
        matches: undefined // Remove Set from response
      }))
      .sort((a, b) => {
        let aValue = 0, bValue = 0

        switch (query.type) {
          case 'goals':
            aValue = a.goals; bValue = b.goals; break
          case 'assists':
            aValue = a.assists; bValue = b.assists; break
          case 'yellow_cards':
            aValue = a.yellowCards; bValue = b.yellowCards; break
          case 'red_cards':
            aValue = a.redCards; bValue = b.redCards; break
          case 'penalty_goals':
            aValue = a.penaltyGoals; bValue = b.penaltyGoals; break
          case 'penalty_misses':
            aValue = a.penaltyMisses; bValue = b.penaltyMisses; break
          case 'own_goals':
            aValue = a.ownGoals; bValue = b.ownGoals; break
          case 'saves':
            aValue = a.saves; bValue = b.saves; break
        }

        if (bValue === aValue) {
          // Tiebreakers
          // For cards, tiebreak by fewer matches played (worse ratio) or maybe just goals?
          // Let's stick to goals/assists logic or matches played
          return b.matchesPlayed - a.matchesPlayed
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
      yellowCards: player.yellowCards,
      redCards: player.redCards,
      penaltyGoals: player.penaltyGoals,
      penaltyMisses: player.penaltyMisses,
      ownGoals: player.ownGoals,
      saves: player.saves,
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
