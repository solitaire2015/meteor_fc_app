import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/stats/[year]/[month] - Get specific monthly stats
export async function GET(
  request: Request,
  { params }: { params: { year: string; month: string } }
) {
  try {
    const year = parseInt(params.year)
    const month = parseInt(params.month)

    const stats = await prisma.monthlyStats.findUnique({
      where: {
        year_month: {
          year,
          month
        }
      }
    })

    if (!stats) {
      // Return default stats if not found
      return NextResponse.json({
        year,
        month,
        gamesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0
      })
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching monthly stats:', error)
    return NextResponse.json({ error: 'Failed to fetch monthly stats' }, { status: 500 })
  }
}