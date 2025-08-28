import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/stats - Get all monthly stats
export async function GET() {
  try {
    const stats = await prisma.monthlyStats.findMany({
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    })

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}

// POST /api/stats - Create or update monthly stats
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { year, month, gamesPlayed, wins, draws, losses, goalsFor, goalsAgainst } = body

    const stats = await prisma.monthlyStats.upsert({
      where: {
        year_month: {
          year,
          month
        }
      },
      update: {
        gamesPlayed,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst
      },
      create: {
        year,
        month,
        gamesPlayed,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst
      }
    })

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error creating/updating stats:', error)
    return NextResponse.json({ error: 'Failed to create/update stats' }, { status: 500 })
  }
}