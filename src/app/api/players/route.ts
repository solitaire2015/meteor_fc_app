import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/players - Get all players with stats
export async function GET() {
  try {
    const players = await prisma.player.findMany({
      include: {
        gameStats: {
          include: {
            game: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Transform to match your current leaderboard format
    const transformedPlayers = players.map(player => {
      const totalGoals = player.gameStats.reduce((sum, stat) => sum + stat.goals, 0)
      const totalAssists = player.gameStats.reduce((sum, stat) => sum + stat.assists, 0)

      return {
        id: parseInt(player.id.slice(-6), 36), // Create a numeric ID for compatibility
        name: player.name,
        team: player.team,
        goals: totalGoals,
        assists: totalAssists,
        initials: player.initials
      }
    })

    return NextResponse.json(transformedPlayers)
  } catch (error) {
    console.error('Error fetching players:', error)
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
  }
}

// POST /api/players - Create a new player
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, initials, team } = body

    const player = await prisma.player.create({
      data: {
        name,
        initials,
        team: team || 'Football Club'
      }
    })

    return NextResponse.json(player)
  } catch (error) {
    console.error('Error creating player:', error)
    return NextResponse.json({ error: 'Failed to create player' }, { status: 500 })
  }
}