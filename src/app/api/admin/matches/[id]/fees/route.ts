import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { FeesUpdateSchema } from '@/lib/validationSchemas'
import { feeCalculationService } from '@/lib/services/feeCalculationService'
import { feeOverrideService } from '@/lib/services/feeOverrideService'

// Removed deprecated PATCH endpoint that directly modified match_participation table
// This was problematic as it overwrote calculated fees with manual overrides
// Use PUT endpoint instead for fee overrides

// PUT /api/admin/matches/[id]/fees - Apply manual fee overrides
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params
    const body = await request.json()
    
    // Validate request body
    const validatedData = FeesUpdateSchema.parse(body)
    
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

    // Use the new service layer to apply bulk overrides
    const overrideInput = {
      overrides: Object.entries(validatedData.manualOverrides).map(([playerId, override]) => ({
        playerId,
        override
      }))
    }

    const result = await feeOverrideService.applyBulkOverrides(matchId, overrideInput)

    if (!result.success && result.errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'PARTIAL_FAILURE',
          message: 'Some overrides failed to apply',
          details: result.errors
        }
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Fee overrides applied successfully',
        overrides: result.results,
        overrideCount: result.results.length,
        errors: result.errors
      }
    })

  } catch (error) {
    if (error instanceof Error && error.constructor.name === 'ZodError') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: (error as any).issues
        }
      }, { status: 400 })
    }

    console.error('Error applying fee overrides:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to apply fee overrides'
      }
    }, { status: 500 })
  }
}

// GET /api/admin/matches/[id]/fees - Get fee calculations and overrides
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

    // Use the new service layer to get comprehensive fee breakdown
    const feeBreakdown = await feeCalculationService.getFeeBreakdown(matchId)
    const overrideStats = await feeOverrideService.getOverrideStatistics(matchId)

    // Transform data to match existing API contract
    const feeBreakdownData = feeBreakdown.players.map(player => ({
      player: {
        id: player.playerId,
        name: player.playerName,
        jerseyNumber: null, // Will be populated by frontend if needed
        position: null // Will be populated by frontend if needed
      },
      totalTime: player.totalTime,
      isLateArrival: player.isLateArrival,
      calculatedFees: {
        fieldFee: player.calculatedFees.fieldFee,
        videoFee: player.calculatedFees.videoFee,
        lateFee: player.calculatedFees.lateFee,
        totalFee: player.calculatedFees.totalFee
      },
      finalFees: player.finalFees,
      override: player.overrides ? {
        fieldFeeOverride: player.overrides.fieldFeeOverride,
        videoFeeOverride: player.overrides.videoFeeOverride,
        lateFeeOverride: player.overrides.lateFeeOverride,
        notes: player.overrides.notes
      } : null
    }))

    return NextResponse.json({
      success: true,
      data: {
        match: {
          id: match.id,
          opponentTeam: match.opponentTeam,
          fieldFeeTotal: match.fieldFeeTotal,
          waterFeeTotal: match.waterFeeTotal
        },
        feeBreakdown: feeBreakdownData,
        summary: {
          totalParticipants: feeBreakdown.totalParticipants,
          totalCalculatedFees: feeBreakdown.totalCalculatedFees,
          totalFinalFees: feeBreakdown.totalFinalFees,
          feeDifference: overrideStats.feeDifference,
          overrideCount: overrideStats.playersWithOverrides,
          overridePercentage: overrideStats.overridePercentage,
          feeCoefficient: feeBreakdown.feeCoefficient
        }
      }
    })

  } catch (error) {
    console.error('Error fetching fee data:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch fee data'
      }
    }, { status: 500 })
  }
}