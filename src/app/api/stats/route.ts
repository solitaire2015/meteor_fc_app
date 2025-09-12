import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { DateFilter, WhereClause, PlayerStats } from '@/types/common'
import { handleApiError, apiSuccess } from '@/lib/errors'

// Validation schema
const statsQuerySchema = z.object({
  year: z.string().optional(),
  month: z.string().optional(),
  type: z.enum(['team', 'player', 'monthly', 'yearly']).default('team')
})

// GET /api/stats - Get calculated statistics
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = statsQuerySchema.parse({
      year: searchParams.get('year') || undefined,
      month: searchParams.get('month') || undefined,
      type: searchParams.get('type') || undefined
    })

    const currentYear = new Date().getFullYear()
    const targetYear = query.year ? parseInt(query.year) : currentYear

    switch (query.type) {
      case 'team':
        return await getTeamStatistics(targetYear, query.month ? parseInt(query.month) : undefined)
      
      case 'player':
        return await getPlayerStatistics(targetYear, query.month ? parseInt(query.month) : undefined)
      
      case 'monthly':
        return await getMonthlyBreakdown(targetYear)
      
      case 'yearly':
        return await getYearlyStatistics()
      
      default:
        return await getTeamStatistics(targetYear)
    }
  } catch (error) {
    return handleApiError(error);
  }
}

async function getTeamStatistics(year: number, month?: number) {
  let dateFilter: WhereClause = {
    matchDate: {
      gte: new Date(`${year}-01-01`),
      lte: new Date(`${year}-12-31`)
    }
  }

  if (month) {
    dateFilter.matchDate = {
      gte: new Date(`${year}-${month.toString().padStart(2, '0')}-01`),
      lte: new Date(year, month, 0) // Last day of month (month is 1-indexed, constructor expects 0-indexed)
    }
  }

  const matches = await prisma.match.findMany({
    where: {
      ...dateFilter,
      // Include matches that have either matchResult set OR both scores available
      OR: [
        { matchResult: { not: null } },
        { 
          AND: [
            { ourScore: { not: null } },
            { opponentScore: { not: null } }
          ]
        }
      ]
    },
    include: {
      events: {
        select: {
          id: true,
          eventType: true,
          minute: true,
          description: true,
          playerId: true,
          matchId: true,
          createdAt: true
        }
      }
    }
  })

  // Calculate team statistics
  const totalMatches = matches.length
  
  // Calculate win/draw/loss - use matchResult if available, otherwise calculate from scores
  const wins = matches.filter(m => {
    if (m.matchResult === 'WIN') return true
    if (m.matchResult === null && m.ourScore !== null && m.opponentScore !== null) {
      return m.ourScore > m.opponentScore
    }
    return false
  }).length
  
  const draws = matches.filter(m => {
    if (m.matchResult === 'DRAW') return true
    if (m.matchResult === null && m.ourScore !== null && m.opponentScore !== null) {
      return m.ourScore === m.opponentScore
    }
    return false
  }).length
  
  const losses = matches.filter(m => {
    if (m.matchResult === 'LOSE') return true
    if (m.matchResult === null && m.ourScore !== null && m.opponentScore !== null) {
      return m.ourScore < m.opponentScore
    }
    return false
  }).length
  
  const goalsFor = matches.reduce((sum, m) => sum + (m.ourScore || 0), 0)
  const goalsAgainst = matches.reduce((sum, m) => sum + (m.opponentScore || 0), 0)
  
  const winRate = totalMatches > 0 ? (wins / totalMatches * 100).toFixed(1) : '0.0'

  // Count events
  const allEvents = matches.flatMap(m => m.events)
  const totalGoals = allEvents.filter(e => e.eventType === 'GOAL' || e.eventType === 'PENALTY_GOAL').length
  const totalAssists = allEvents.filter(e => e.eventType === 'ASSIST').length
  const totalYellowCards = allEvents.filter(e => e.eventType === 'YELLOW_CARD').length
  const totalRedCards = allEvents.filter(e => e.eventType === 'RED_CARD').length

  return apiSuccess({
    period: month ? `${year}-${month.toString().padStart(2, '0')}` : year.toString(),
    totalMatches,
    wins,
    draws,
    losses,
    winRate: parseFloat(winRate),
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    totalGoals,
    totalAssists,
    totalYellowCards,
    totalRedCards,
    averageGoalsPerMatch: totalMatches > 0 ? (goalsFor / totalMatches).toFixed(2) : '0.00',
    averageGoalsAgainstPerMatch: totalMatches > 0 ? (goalsAgainst / totalMatches).toFixed(2) : '0.00'
  })
}

async function getPlayerStatistics(year: number, month?: number) {
  let dateFilter: WhereClause = {
    match: {
      matchDate: {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`)
      },
      OR: [
        { matchResult: { not: null } },
        { 
          AND: [
            { ourScore: { not: null } },
            { opponentScore: { not: null } }
          ]
        }
      ]
    }
  }

  if (month) {
    dateFilter.match = {
      matchDate: {
        gte: new Date(`${year}-${month.toString().padStart(2, '0')}-01`),
        lte: new Date(year, month, 0)
      },
      OR: [
        { matchResult: { not: null } },
        { 
          AND: [
            { ourScore: { not: null } },
            { opponentScore: { not: null } }
          ]
        }
      ]
    }
  }

  // Get all events for the period (exclude deleted users for player stats)
  const events = await prisma.matchEvent.findMany({
    where: {
      ...dateFilter,
      player: {
        deletedAt: null // Only include events from active players
      }
    },
    include: {
      player: {
        select: {
          id: true,
          name: true,
          jerseyNumber: true,
          position: true
        }
      },
      match: {
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
          status: true
        }
      }
    }
  })

  // Get all participations for the period (exclude deleted users for player stats)
  const participations = await prisma.matchParticipation.findMany({
    where: {
      ...dateFilter,
      user: {
        deletedAt: null // Only include participations from active players
      }
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          jerseyNumber: true,
          position: true
        }
      },
      match: {
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
          status: true
        }
      }
    }
  })

  // Calculate player statistics
  const playerStats: Record<string, PlayerStats> = {}

  // Initialize from participations
  participations.forEach(p => {
    if (!playerStats[p.userId]) {
      playerStats[p.userId] = {
        id: p.userId,
        name: p.user.name,
        appearances: 0,
        totalTime: 0,
        goals: 0,
        assists: 0,
        ownGoals: 0,
        yellowCards: 0,
        redCards: 0,
        penalties: 0,
        saves: 0
      }
    }
    
    playerStats[p.userId].appearances++
    playerStats[p.userId].totalTime += Number(p.totalTime)
  })

  // Add event statistics
  events.forEach(event => {
    if (!playerStats[event.playerId]) {
      playerStats[event.playerId] = {
        id: event.playerId,
        name: event.player.name,
        appearances: 0,
        totalTime: 0,
        goals: 0,
        assists: 0,
        ownGoals: 0,
        yellowCards: 0,
        redCards: 0,
        penalties: 0,
        saves: 0
      }
    }

    switch (event.eventType) {
      case 'GOAL':
        playerStats[event.playerId].goals++
        break
      case 'ASSIST':
        playerStats[event.playerId].assists++
        break
      case 'OWN_GOAL':
        playerStats[event.playerId].ownGoals++
        break
      case 'YELLOW_CARD':
        playerStats[event.playerId].yellowCards++
        break
      case 'RED_CARD':
        playerStats[event.playerId].redCards++
        break
      case 'PENALTY_GOAL':
        playerStats[event.playerId].goals++
        playerStats[event.playerId].penalties++
        break
      case 'SAVE':
        playerStats[event.playerId].saves++
        break
    }
  })

  const sortedPlayers = Object.values(playerStats).sort((a: PlayerStats, b: PlayerStats) => b.goals - a.goals)

  return NextResponse.json({
    success: true,
    data: {
      period: month ? `${year}-${month.toString().padStart(2, '0')}` : year.toString(),
      players: sortedPlayers
    }
  })
}

async function getMonthlyBreakdown(year: number) {
  const monthlyStats = []

  for (let month = 1; month <= 12; month++) {
    const startDate = new Date(`${year}-${month.toString().padStart(2, '0')}-01`)
    const endDate = new Date(year, month, 0)

    const matches = await prisma.match.findMany({
      where: {
        matchDate: {
          gte: startDate,
          lte: endDate
        },
        OR: [
          { matchResult: { not: null } },
          { 
            AND: [
              { ourScore: { not: null } },
              { opponentScore: { not: null } }
            ]
          }
        ]
      }
    })

    const totalMatches = matches.length
    const wins = matches.filter(m => {
      if (m.matchResult === 'WIN') return true
      if (m.matchResult === null && m.ourScore !== null && m.opponentScore !== null) {
        return m.ourScore > m.opponentScore
      }
      return false
    }).length
    
    const draws = matches.filter(m => {
      if (m.matchResult === 'DRAW') return true
      if (m.matchResult === null && m.ourScore !== null && m.opponentScore !== null) {
        return m.ourScore === m.opponentScore
      }
      return false
    }).length
    
    const losses = matches.filter(m => {
      if (m.matchResult === 'LOSE') return true
      if (m.matchResult === null && m.ourScore !== null && m.opponentScore !== null) {
        return m.ourScore < m.opponentScore
      }
      return false
    }).length
    const goalsFor = matches.reduce((sum, m) => sum + (m.ourScore || 0), 0)
    const goalsAgainst = matches.reduce((sum, m) => sum + (m.opponentScore || 0), 0)

    monthlyStats.push({
      year,
      month,
      totalMatches,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      winRate: totalMatches > 0 ? (wins / totalMatches * 100).toFixed(1) : '0.0'
    })
  }

  return NextResponse.json({
    success: true,
    data: {
      year,
      months: monthlyStats
    }
  })
}

async function getYearlyStatistics() {
  // Get all years with matches
  const years = await prisma.match.findMany({
    select: {
      matchDate: true
    },
    distinct: ['matchDate'],
    orderBy: {
      matchDate: 'desc'
    }
  })

  const uniqueYears = [...new Set(years.map(m => m.matchDate.getFullYear()))]
  const yearlyStats = []

  for (const year of uniqueYears) {
    const matches = await prisma.match.findMany({
      where: {
        matchDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`)
        },
        OR: [
          { matchResult: { not: null } },
          { 
            AND: [
              { ourScore: { not: null } },
              { opponentScore: { not: null } }
            ]
          }
        ]
      }
    })

    const totalMatches = matches.length
    const wins = matches.filter(m => {
      if (m.matchResult === 'WIN') return true
      if (m.matchResult === null && m.ourScore !== null && m.opponentScore !== null) {
        return m.ourScore > m.opponentScore
      }
      return false
    }).length
    
    const draws = matches.filter(m => {
      if (m.matchResult === 'DRAW') return true
      if (m.matchResult === null && m.ourScore !== null && m.opponentScore !== null) {
        return m.ourScore === m.opponentScore
      }
      return false
    }).length
    
    const losses = matches.filter(m => {
      if (m.matchResult === 'LOSE') return true
      if (m.matchResult === null && m.ourScore !== null && m.opponentScore !== null) {
        return m.ourScore < m.opponentScore
      }
      return false
    }).length
    const goalsFor = matches.reduce((sum, m) => sum + (m.ourScore || 0), 0)
    const goalsAgainst = matches.reduce((sum, m) => sum + (m.opponentScore || 0), 0)

    yearlyStats.push({
      year,
      totalMatches,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      winRate: totalMatches > 0 ? (wins / totalMatches * 100).toFixed(1) : '0.0'
    })
  }

  return NextResponse.json({
    success: true,
    data: {
      years: yearlyStats
    }
  })
}