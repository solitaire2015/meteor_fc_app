import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { CACHE_TAGS, invalidateCacheTags } from '@/lib/cache'

const updateNotesSchema = z.object({
  participationNotes: z.array(z.object({
    userId: z.string(),
    notes: z.string()
  }))
})

// POST /api/admin/matches/[id]/notes - Update player notes for a match
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params
    const body = await request.json()
    
    // Validate request body
    const validatedData = updateNotesSchema.parse(body)
    
    // Check if match exists
    const match = await prisma.match.findUnique({
      where: { id: matchId }
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

    // Update notes in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updates = []
      
      for (const noteUpdate of validatedData.participationNotes) {
        const updated = await tx.matchParticipation.updateMany({
          where: {
            matchId,
            userId: noteUpdate.userId
          },
          data: {
            notes: noteUpdate.notes
          }
        })
        updates.push(updated)
      }
      
      return updates
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
      data: {
        message: 'Player notes updated successfully',
        updatesCount: result.length
      }
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

    console.error('Error updating player notes:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update player notes'
      }
    }, { status: 500 })
  }
}
