import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MatchInfoUpdateSchema } from '@/lib/validationSchemas'
import { feeCalculationService } from '@/lib/services/feeCalculationService'
import { CACHE_TAGS, invalidateCacheTags } from '@/lib/cache'
import { ZodError } from 'zod'

// PUT /api/admin/matches/[id]/info - Update match basic information
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params
    const body = await request.json()
    
    // Validate request body
    const validatedData = MatchInfoUpdateSchema.parse(body)
    
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

    // Calculate match result if both scores are provided
    let matchResult = existingMatch.matchResult
    if (validatedData.ourScore !== undefined && validatedData.opponentScore !== undefined) {
      if (validatedData.ourScore > validatedData.opponentScore) {
        matchResult = 'WIN'
      } else if (validatedData.ourScore < validatedData.opponentScore) {
        matchResult = 'LOSE'
      } else {
        matchResult = 'DRAW'
      }
    }

    // Check if field or water fees are being updated (requires fee recalculation)
    const needsFeeRecalculation = 
      validatedData.fieldFeeTotal !== undefined || 
      validatedData.waterFeeTotal !== undefined

    // Update match basic information
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        ...validatedData,
        matchResult,
        updatedAt: new Date()
      }
    })

    // Auto-recalculate fees if field or water fees changed
    let feeRecalculationResult = null
    if (needsFeeRecalculation) {
      try {
        feeRecalculationResult = await feeCalculationService.recalculateAllFees(matchId)
      } catch (feeError) {
        console.error('Fee recalculation failed:', feeError)
        // Don't fail the entire request if fee recalculation fails
        // The match info update succeeded, but fees may be inconsistent
      }
    }

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
        message: 'Match information updated successfully',
        match: updatedMatch,
        feeRecalculation: feeRecalculationResult ? {
          recalculated: true,
          totalParticipants: feeRecalculationResult.totalParticipants,
          feeCoefficient: feeRecalculationResult.feeCoefficient,
          totalFinalFees: feeRecalculationResult.totalFinalFees
        } : {
          recalculated: false,
          reason: 'No fee-related fields were updated'
        }
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

    console.error('Error updating match info:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update match information'
      }
    }, { status: 500 })
  }
}

// GET /api/admin/matches/[id]/info - Get match basic information
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params
    
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        matchDate: true,
        matchTime: true,
        opponentTeam: true,
        ourScore: true,
        opponentScore: true,
        matchResult: true,
        fieldFeeTotal: true,
        waterFeeTotal: true,
        notes: true,
        createdAt: true,
        updatedAt: true
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
    console.error('Error fetching match info:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch match information'
      }
    }, { status: 500 })
  }
}
