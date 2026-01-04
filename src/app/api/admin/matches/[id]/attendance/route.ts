import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AttendanceUpdateSchema } from '@/lib/validationSchemas'
import { attendanceService } from '@/lib/services/attendanceService'
import { CACHE_TAGS, invalidateCacheTags } from '@/lib/cache'
import { ZodError } from 'zod'

// PUT /api/admin/matches/[id]/attendance - Update attendance grid data only
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params
    const body = await request.json()
    
    // Validate request body
    const validatedData = AttendanceUpdateSchema.parse(body)
    
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

    // Use the enhanced attendance service for validation and processing
    const updateRequest = {
      attendanceData: validatedData.attendanceData,
      events: validatedData.events
    }

    // Extract match info from request, ensuring all required fields are present
    const matchInfo = {
      fieldFeeTotal: validatedData.matchInfo?.fieldFeeTotal ?? match.fieldFeeTotal ?? 0,
      waterFeeTotal: validatedData.matchInfo?.waterFeeTotal ?? match.waterFeeTotal ?? 0,
      lateFeeRate: validatedData.matchInfo?.lateFeeRate ?? match.lateFeeRate ?? 10,
      videoFeePerUnit: validatedData.matchInfo?.videoFeePerUnit ?? match.videoFeePerUnit ?? 2
    }

    // Use selected player IDs from request to completely avoid database query
    const selectedPlayerIds = validatedData.selectedPlayerIds || []

    const result = await attendanceService.updateAttendance(matchId, updateRequest, matchInfo, selectedPlayerIds)

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
      console.warn('Cache invalidation failed after attendance update:', cacheError)
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Attendance data updated successfully',
        participationsCount: result.data.participationsCount,
        eventsCount: result.data.eventsCount,
        feeCoefficient: result.data.feeCoefficient,
        conflictsResolved: result.data.conflictsResolved,
        warnings: result.data.warnings
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

    console.error('Error updating attendance:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update attendance data'
      }
    }, { status: 500 })
  }
}

// GET /api/admin/matches/[id]/attendance - Get attendance data
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

    // Use the attendance service to get data
    const result = await attendanceService.getAttendanceData(matchId)

    return NextResponse.json({
      success: true,
      data: {
        attendanceData: result.attendanceData,
        eventsSummary: result.eventsSummary,
        totalParticipants: result.totalParticipants,
        totalEvents: result.totalEvents,
        selectedPlayers: result.selectedPlayers
      }
    })

  } catch (error) {
    console.error('Error fetching attendance data:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch attendance data'
      }
    }, { status: 500 })
  }
}
