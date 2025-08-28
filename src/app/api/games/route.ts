import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/games - Get all games
export async function GET() {
  try {
    const games = await prisma.game.findMany({
      orderBy: {
        date: 'desc'
      },
      include: {
        players: {
          include: {
            player: true
          }
        }
      }
    })

    // Transform to match your current format
    const transformedGames = games.map(game => ({
      id: game.id,
      date: game.date.toISOString().split('T')[0].replace('-', '月').replace('-', '日').replace(/^\d{4}/, (year) => `${parseInt(year) - 2000}年`),
      opponent: game.opponent,
      result: game.result,
      status: game.status === 'FINISHED' ? '已结束' : '即将开始'
    }))

    return NextResponse.json(transformedGames)
  } catch (error) {
    console.error('Error fetching games:', error)
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
  }
}

// POST /api/games - Create a new game
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { date, opponent, result, status, players } = body

    const game = await prisma.game.create({
      data: {
        date: new Date(date),
        opponent,
        result,
        status: status === '已结束' ? 'FINISHED' : 'UPCOMING',
        players: {
          create: players?.map((player: any) => ({
            playerId: player.playerId,
            goals: player.goals || 0,
            assists: player.assists || 0,
            section1: player.section1 || 0,
            section2: player.section2 || 0,
            section3: player.section3 || 0,
            total: player.total || 0,
            fieldFee: player.fieldFee || 0,
            onTime: player.onTime ?? true,
            videoCost: player.videoCost || 0,
            totalCost: player.totalCost || 0,
            notes: player.notes || ''
          })) || []
        }
      },
      include: {
        players: {
          include: {
            player: true
          }
        }
      }
    })

    return NextResponse.json(game)
  } catch (error) {
    console.error('Error creating game:', error)
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 })
  }
}