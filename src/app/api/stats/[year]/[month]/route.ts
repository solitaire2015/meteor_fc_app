import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildCacheKey, CACHE_TAGS, getCachedJson, setCachedJson } from '@/lib/cache'

// GET /api/stats/[year]/[month] - Get specific monthly stats
export async function GET(
  request: Request,
  { params }: { params: { year: string; month: string } }
) {
  try {
    const year = parseInt(params.year)
    const month = parseInt(params.month)

    const cacheKey = buildCacheKey(new URL(request.url))
    const cached = await getCachedJson<Record<string, unknown>>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const stats = await prisma.monthlyStats.findUnique({
      where: {
        year_month: {
          year,
          month
        }
      }
    })

    const payload = stats ?? {
      year,
      month,
      gamesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0
    }

    await setCachedJson({
      key: cacheKey,
      value: payload,
      tags: [CACHE_TAGS.STATS]
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Error fetching monthly stats:', error)
    return NextResponse.json({ error: 'Failed to fetch monthly stats' }, { status: 500 })
  }
}
