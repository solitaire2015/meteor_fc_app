import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MatchInfoUpdateSchema } from '@/lib/validationSchemas'
import { feeCalculationService } from '@/lib/services/feeCalculationService'
import { CACHE_TAGS, invalidateCacheTags } from '@/lib/cache'
import { ZodError } from 'zod'

const roundFee = (value: number) => Math.ceil(value)

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
    const roundedData = {
      ...validatedData,
      fieldFeeTotal: validatedData.fieldFeeTotal !== undefined
        ? roundFee(validatedData.fieldFeeTotal)
        : validatedData.fieldFeeTotal,
      waterFeeTotal: validatedData.waterFeeTotal !== undefined
        ? roundFee(validatedData.waterFeeTotal)
        : validatedData.waterFeeTotal
    }
    
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

    const previousSectionCount = existingMatch.sectionCount ?? 3
    const nextSectionCount = roundedData.sectionCount ?? previousSectionCount

    const needsFeeRecalculation =
      roundedData.fieldFeeTotal !== undefined ||
      roundedData.waterFeeTotal !== undefined ||
      (roundedData.sectionCount !== undefined && roundedData.sectionCount !== previousSectionCount)

    const pruneAttendancePayload = (payload: any, sectionCount: number) => {
      if (!payload || typeof payload !== 'object') return payload

      const ensureParts = (fill: number | boolean) => ({ '1': fill, '2': fill, '3': fill })

      const attendance = (payload as any).attendance
      const goalkeeper = (payload as any).goalkeeper

      const nextAttendance: Record<string, Record<string, number>> = {}
      const nextGoalkeeper: Record<string, Record<string, boolean>> = {}

      for (let section = 1; section <= sectionCount; section++) {
        const key = section.toString()
        nextAttendance[key] = { ...(attendance?.[key] ?? ensureParts(0)) }
        nextGoalkeeper[key] = { ...(goalkeeper?.[key] ?? ensureParts(false)) }
      }

      return {
        ...payload,
        attendance: nextAttendance,
        goalkeeper: nextGoalkeeper
      }
    }

    // Update match (and prune attendance data if sectionCount decreased)
    const updatedMatch = await prisma.$transaction(async (tx) => {
      const matchUpdated = await tx.match.update({
        where: { id: matchId },
        data: {
          ...roundedData,
          matchResult,
          updatedAt: new Date()
        }
      })

      if (roundedData.sectionCount !== undefined && nextSectionCount < previousSectionCount) {
        const participations = await tx.matchParticipation.findMany({
          where: { matchId },
          select: { userId: true, matchId: true, attendanceData: true }
        })

        for (const p of participations) {
          const pruned = pruneAttendancePayload(p.attendanceData, nextSectionCount)
          await tx.matchParticipation.update({
            where: { userId_matchId: { userId: p.userId, matchId: p.matchId } },
            data: { attendanceData: pruned }
          })
        }
      }

      return matchUpdated
    })

    // Auto-recalculate fees if fee-related fields or sectionCount changed
    let feeRecalculationResult = null
    if (needsFeeRecalculation) {
      try {
        feeRecalculationResult = await feeCalculationService.recalculateAllFees(matchId)
      } catch (feeError) {
        console.error('Fee recalculation failed:', feeError)
        // Don't fail the entire request if fee recalculation fails
      }
    }

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
      console.warn('Cache invalidation failed after match info update:', cacheError)
    }

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
        sectionCount: true,
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
