import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SelectedPlayersSchema } from '@/lib/validationSchemas'
import { CACHE_TAGS, invalidateCacheTags } from '@/lib/cache'
import { ZodError } from 'zod'

// PUT /api/admin/matches/[id]/players - Update selected players for match
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params
    const body = await request.json()
    
    // Validate request body
    const validatedData = SelectedPlayersSchema.parse(body)
    
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

    // Verify all players exist
    const players = await prisma.user.findMany({
      where: {
        id: { in: validatedData.playerIds }
      },
      select: { id: true, name: true }
    })

    if (players.length !== validatedData.playerIds.length) {
      const foundIds = players.map(p => p.id)
      const missingIds = validatedData.playerIds.filter(id => !foundIds.includes(id))
      
      return NextResponse.json({
        success: false,
        error: {
          code: 'PLAYERS_NOT_FOUND',
          message: 'Some players not found',
          details: { missingPlayerIds: missingIds }
        }
      }, { status: 400 })
    }

    // Update selected players atomically
    const result = await prisma.$transaction(async (tx) => {
      // Remove existing selected players
      await tx.matchPlayer.deleteMany({
        where: { matchId }
      })

      // Add new selected players
      if (validatedData.playerIds.length > 0) {
        await tx.matchPlayer.createMany({
          data: validatedData.playerIds.map(playerId => ({
            matchId,
            playerId
          }))
        })
      }

      // Return the new selected players with user info
      return await tx.matchPlayer.findMany({
        where: { matchId },
        include: {
          player: {
            select: {
              id: true,
              name: true,
              jerseyNumber: true,
              position: true
            }
          }
        }
      })
    })

    try {
      await invalidateCacheTags([
        CACHE_TAGS.MATCHES,
        CACHE_TAGS.GAMES,
        CACHE_TAGS.PLAYERS,
        CACHE_TAGS.LEADERBOARD,
        CACHE_TAGS.STATS,
        CACHE_TAGS.STATISTICS
      ])
    } catch (cacheError) {
      console.warn('Cache invalidation failed after match players update:', cacheError)
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Selected players updated successfully',
        selectedPlayers: result.map(mp => mp.player),
        count: result.length
      }
    })

  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues
        }
      }, { status: 400 })
    }

    console.error('Error updating selected players:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update selected players'
      }
    }, { status: 500 })
  }
}

// GET /api/admin/matches/[id]/players - Get selected players for match
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params
    
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

    // Get selected players
    const selectedPlayers = await prisma.matchPlayer.findMany({
      where: {
        matchId,
        player: { deletedAt: null }
      },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            jerseyNumber: true,
            position: true,
            avatarUrl: true
          }
        }
      },
      orderBy: {
        player: {
          name: 'asc'
        }
      }
    })

    // Also get all available players for selection (including admins and ghost players)
    const allPlayers = await prisma.user.findMany({
      where: {
        userType: { in: ['PLAYER', 'ADMIN'] },
        deletedAt: null
        // Removed accountStatus filter to include GHOST players
      },
      select: {
        id: true,
        name: true,
        jerseyNumber: true,
        position: true,
        avatarUrl: true,
        accountStatus: true // Include status for debugging
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        selectedPlayers: selectedPlayers.map(mp => mp.player),
        allPlayers,
        selectedCount: selectedPlayers.length,
        totalAvailable: allPlayers.length
      }
    })

  } catch (error) {
    console.error('Error fetching selected players:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch selected players'
      }
    }, { status: 500 })
  }
}
