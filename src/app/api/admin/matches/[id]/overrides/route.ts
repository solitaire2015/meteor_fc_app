import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/matches/[id]/overrides - Get raw fee overrides for a match
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params
    
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

    // Fetch all fee overrides for this match
    const feeOverrides = await prisma.feeOverride.findMany({
      where: { 
        matchId: matchId 
      },
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

    return NextResponse.json({
      success: true,
      data: feeOverrides
    })

  } catch (error) {
    console.error('Error fetching fee overrides:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch fee overrides'
      }
    }, { status: 500 })
  }
}