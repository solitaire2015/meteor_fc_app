import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { successResponse, errorResponse, validationError } from '@/lib/apiResponse'
import { StatsQuerySchema, validateRequest } from '@/lib/validationSchemas'

const prisma = new PrismaClient()

// GET /api/statistics - Get team or player statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const validation = validateRequest(StatsQuerySchema, {
      type: searchParams.get('type'),
      year: searchParams.get('year'),
      month: searchParams.get('month')
    })

    if (!validation.success) {
      return validationError(validation.error, validation.details)
    }

    const { type, year, month } = validation.data

    if (type === 'player') {
      const playerStats = await getPlayerStatistics(year, month)
      return successResponse({
        type: 'player',
        period: `${year || 'All'}${month ? `-${month.toString().padStart(2, '0')}` : ''}`,
        players: playerStats
      })
    } else {
      const teamStats = await getTeamStatistics(year, month)
      return successResponse({
        type: 'team',
        period: `${year || 'All'}${month ? `-${month.toString().padStart(2, '0')}` : ''}`,
        ...teamStats
      })
    }
  } catch (error) {
    console.error('Error fetching statistics:', error)
    return errorResponse('Failed to fetch statistics')
  }
}

async function getPlayerStatistics(year?: number, month?: number) {
  // Build date filter
  const dateFilter: any = {}
  if (year) {
    const startDate = new Date(year, month ? month - 1 : 0, 1)
    const endDate = month 
      ? new Date(year, month, 0, 23, 59, 59) 
      : new Date(year + 1, 0, 0, 23, 59, 59)
    
    dateFilter.matchDate = {
      gte: startDate,
      lte: endDate
    }
  }

  // Get all users with their match events
  const users = await prisma.user.findMany({
    where: { userType: 'PLAYER' },
    include: {
      matchEvents: {
        where: {
          match: dateFilter
        }
      },
      participations: {
        where: {
          match: dateFilter
        }
      }
    },
    orderBy: { name: 'asc' }
  })

  return users.map((user, index) => {
    const goals = user.matchEvents.filter(event => 
      event.eventType === 'GOAL' || event.eventType === 'PENALTY_GOAL'
    ).length
    
    const assists = user.matchEvents.filter(event => 
      event.eventType === 'ASSIST'
    ).length

    const gamesPlayed = user.participations.length

    return {
      rank: index + 1,
      id: user.id,
      name: user.name,
      abbreviation: user.name.length > 2 ? user.name.substring(0, 2) : user.name,
      goals,
      assists,
      gamesPlayed,
      jerseyNumber: user.jerseyNumber
    }
  }).sort((a, b) => {
    // Sort by goals desc, then assists desc, then name asc
    if (b.goals !== a.goals) return b.goals - a.goals
    if (b.assists !== a.assists) return b.assists - a.assists
    return a.name.localeCompare(b.name)
  }).map((player, index) => ({
    ...player,
    rank: index + 1
  }))
}

async function getTeamStatistics(year?: number, month?: number) {
  // Build date filter
  const dateFilter: any = {}
  if (year) {
    const startDate = new Date(year, month ? month - 1 : 0, 1)
    const endDate = month 
      ? new Date(year, month, 0, 23, 59, 59) 
      : new Date(year + 1, 0, 0, 23, 59, 59)
    
    dateFilter.matchDate = {
      gte: startDate,
      lte: endDate
    }
  }

  // Get match statistics
  const matches = await prisma.match.findMany({
    where: dateFilter,
    include: {
      events: true
    }
  })

  const totalMatches = matches.length
  const wins = matches.filter(m => m.matchResult === 'WIN').length
  const draws = matches.filter(m => m.matchResult === 'DRAW').length
  const losses = matches.filter(m => m.matchResult === 'LOSE').length
  
  const goalsFor = matches.reduce((sum, m) => sum + (m.ourScore || 0), 0)
  const goalsAgainst = matches.reduce((sum, m) => sum + (m.opponentScore || 0), 0)
  const goalDifference = goalsFor - goalsAgainst
  
  const totalGoals = matches.reduce((sum, m) => {
    return sum + m.events.filter(e => e.eventType === 'GOAL' || e.eventType === 'PENALTY_GOAL').length
  }, 0)
  
  const totalAssists = matches.reduce((sum, m) => {
    return sum + m.events.filter(e => e.eventType === 'ASSIST').length
  }, 0)

  const totalYellowCards = matches.reduce((sum, m) => {
    return sum + m.events.filter(e => e.eventType === 'YELLOW_CARD').length
  }, 0)

  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0

  return {
    totalMatches,
    wins,
    draws,
    losses,
    winRate,
    goalsFor,
    goalsAgainst,
    goalDifference,
    totalGoals,
    totalAssists,
    totalYellowCards
  }
}