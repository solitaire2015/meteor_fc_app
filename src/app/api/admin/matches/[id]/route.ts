import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { CACHE_TAGS, invalidateCacheTags } from '@/lib/cache'

const updateMatchSchema = z.object({
  opponentTeam: z.string().optional(),
  matchDate: z.string().datetime().optional(),
  matchTime: z.string().datetime().nullable().optional(),
  ourScore: z.number().int().min(0).nullable().optional(),
  opponentScore: z.number().int().min(0).nullable().optional(),
  fieldFeeTotal: z.coerce.number().min(0).optional(),
  waterFeeTotal: z.coerce.number().min(0).optional(),
  notes: z.string().nullable().optional()
})

// PATCH /api/admin/matches/[id] - Update match basic information
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params
    const body = await request.json()
    
    // Validate request body
    const validatedData = updateMatchSchema.parse(body)
    
    // Check if match exists
    const existingMatch = await prisma.match.findUnique({
      where: { id: matchId }
    })
    
    if (!existingMatch) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MATCH_NOT_FOUND',
          message: 'Match not found'
        }
      }, { status: 404 })
    }

    // Auto-calculate match result based on scores (result field doesn't exist in schema yet)
    // let result = existingMatch.result
    // This will be implemented when result field is added to schema

    // Update match
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        ...validatedData,
        updatedAt: new Date()
      }
    })

    await invalidateCacheTags([
      CACHE_TAGS.MATCHES,
      CACHE_TAGS.GAMES,
      CACHE_TAGS.PLAYERS,
      CACHE_TAGS.LEADERBOARD,
      CACHE_TAGS.STATS,
      CACHE_TAGS.STATISTICS
    ])

    return NextResponse.json({
      success: true,
      data: updatedMatch
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues
        }
      }, { status: 400 })
    }

    console.error('Error updating match:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update match'
      }
    }, { status: 500 })
  }
}

// GET /api/admin/matches/[id] - Get match details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params
    
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        participations: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        events: true
      }
    })
    
    if (!match) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MATCH_NOT_FOUND',
          message: 'Match not found'
        }
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: match
    })

  } catch (error) {
    console.error('Error fetching match:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch match'
      }
    }, { status: 500 })
  }
}
