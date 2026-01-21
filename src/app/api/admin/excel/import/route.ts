import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { parseExcelFile, ExcelPlayerData } from '@/lib/excelParser'
import { calculateCoefficient } from '@/lib/utils/coefficient'
import { calculatePlayerFees, type AttendanceData } from '@/lib/feeCalculation'
import { globalSettingsService } from '@/lib/services/globalSettingsService'
import { CACHE_TAGS, invalidateCacheTags } from '@/lib/cache'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { success: false, error: 'File must be an Excel file (.xlsx or .xls)' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Parse Excel file
    const excelData = parseExcelFile(buffer)

    // Get existing users and their short IDs
    const existingUsers = await prisma.user.findMany({
      select: { id: true, name: true, shortId: true }
    })

    // Get first admin user for createdBy field
    const adminUser = await prisma.user.findFirst({
      where: { userType: 'ADMIN' },
      select: { id: true }
    })

    if (!adminUser) {
      return NextResponse.json({
        success: false,
        error: 'No admin user found. Please create an admin user first.'
      }, { status: 400 })
    }

    // Map Excel players to existing users and identify unknown players
    const playerMappings: Array<{
      excelPlayer: ExcelPlayerData
      userId?: string
      isUnknown: boolean
    }> = []

    const unmatchedPlayers: string[] = []

    for (const excelPlayer of excelData.players) {
      // Try to find existing user by shortId from Excel
      const existingUser = existingUsers.find(u => u.shortId === excelPlayer.shortId)

      if (existingUser) {
        playerMappings.push({
          excelPlayer,
          userId: existingUser.id,
          isUnknown: false
        })
      } else {
        playerMappings.push({
          excelPlayer,
          isUnknown: true
        })
        unmatchedPlayers.push(excelPlayer.shortId || excelPlayer.姓名)
      }
    }

    // Check if we have any matched players to proceed
    const matchedMappings = playerMappings.filter(p => !p.isUnknown)
    if (matchedMappings.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No players matched. Please ensure at least some players have correct shortIds.',
        data: {
          unknownPlayers: unmatchedPlayers,
          totalPlayers: excelData.players.length,
          matchedPlayers: 0
        }
      }, { status: 400 })
    }

    // Read global base fee rates before creating match
    const { baseVideoFeeRate, baseLateFeeRate } = await globalSettingsService.getBaseFeeRates()

    // Create match record
    const match = await prisma.match.create({
      data: {
        matchDate: new Date(), // Using current date as requested
        opponentTeam: excelData.matchTitle.replace(/^\d+月\d+日VS/, '') || 'Unknown Team',
        ourScore: excelData.ourScore,
        opponentScore: excelData.opponentScore,
        fieldFeeTotal: Math.round(excelData.fieldFeeTotal),
        waterFeeTotal: Math.round(excelData.waterFeeTotal),
        lateFeeRate: Math.round(baseLateFeeRate),
        videoFeePerUnit: Math.round(baseVideoFeeRate),
        notes: JSON.stringify({
          importedFrom: file.name,
          importedAt: new Date().toISOString(),
          originalSheetName: excelData.matchTitle
        }),
        createdBy: adminUser.id
      }
    })

    // Auto-select all imported players by creating MatchPlayer records
    const matchPlayerData = matchedMappings
      .filter(mapping => mapping.userId)
      .map(mapping => ({
        matchId: match.id,
        playerId: mapping.userId!
      }))

    if (matchPlayerData.length > 0) {
      await prisma.matchPlayer.createMany({
        data: matchPlayerData
      })
    }

    // Calculate coefficient for fee calculations
    const coefficient = calculateCoefficient(
      Math.round(Number(excelData.fieldFeeTotal)),
      Math.round(Number(excelData.waterFeeTotal)),
      90 // Fixed total time units
    )

    // Create participation records and events using new attendance structure
    const participations = []
    const events = []

    for (const mapping of matchedMappings) {
      if (!mapping.userId) continue; // Skip if no userId

      const { excelPlayer } = mapping

      // Build attendance data in the new format expected by state store
      const attendanceData = {
        attendance: {
          "1": {
            "1": excelPlayer.section1[0] === '守门' ? 1 : (excelPlayer.section1[0] || 0),
            "2": excelPlayer.section1[1] === '守门' ? 1 : (excelPlayer.section1[1] || 0),
            "3": excelPlayer.section1[2] === '守门' ? 1 : (excelPlayer.section1[2] || 0)
          },
          "2": {
            "1": excelPlayer.section2[0] === '守门' ? 1 : (excelPlayer.section2[0] || 0),
            "2": excelPlayer.section2[1] === '守门' ? 1 : (excelPlayer.section2[1] || 0),
            "3": excelPlayer.section2[2] === '守门' ? 1 : (excelPlayer.section2[2] || 0)
          },
          "3": {
            "1": excelPlayer.section3[0] === '守门' ? 1 : (excelPlayer.section3[0] || 0),
            "2": excelPlayer.section3[1] === '守门' ? 1 : (excelPlayer.section3[1] || 0),
            "3": excelPlayer.section3[2] === '守门' ? 1 : (excelPlayer.section3[2] || 0)
          }
        },
        goalkeeper: {
          "1": {
            ...(excelPlayer.section1[0] === '守门' && { "1": true }),
            ...(excelPlayer.section1[1] === '守门' && { "2": true }),
            ...(excelPlayer.section1[2] === '守门' && { "3": true })
          },
          "2": {
            ...(excelPlayer.section2[0] === '守门' && { "1": true }),
            ...(excelPlayer.section2[1] === '守门' && { "2": true }),
            ...(excelPlayer.section2[2] === '守门' && { "3": true })
          },
          "3": {
            ...(excelPlayer.section3[0] === '守门' && { "1": true }),
            ...(excelPlayer.section3[1] === '守门' && { "2": true }),
            ...(excelPlayer.section3[2] === '守门' && { "3": true })
          }
        },
        isLateArrival: !excelPlayer.onTime
      }

      // Calculate fees using the centralized fee calculation logic with base rates
      const calculatedFees = calculatePlayerFees({
        attendanceData: attendanceData as AttendanceData,
        isLateArrival: !excelPlayer.onTime,
        feeCoefficient: coefficient,
        lateFeeRate: baseLateFeeRate,
        videoFeeRate: baseVideoFeeRate
      })

      // Create participation record (without notes)
      const participation = await prisma.matchParticipation.create({
        data: {
          userId: mapping.userId,
          matchId: match.id,
          attendanceData,
          isLateArrival: !excelPlayer.onTime,
          totalTime: calculatedFees.normalPlayerParts,
          fieldFeeCalculated: calculatedFees.fieldFee,
          lateFee: calculatedFees.lateFee,
          videoFee: calculatedFees.videoFee,
          totalFeeCalculated: calculatedFees.totalFee
        }
      })

      // Create FeeOverride record ONLY if notes exist (as per business requirement)
      if (excelPlayer.notes.trim()) {
        await prisma.feeOverride.create({
          data: {
            matchId: match.id,
            playerId: mapping.userId,
            fieldFeeOverride: Math.round(Number(excelPlayer.实收费用 || 0)), // Use actual fee from Excel as override
            notes: excelPlayer.notes.trim()
          }
        })
      }

      participations.push(participation)

      // Create goal events
      for (let i = 0; i < excelPlayer.goals; i++) {
        events.push({
          matchId: match.id,
          playerId: mapping.userId,
          eventType: 'GOAL' as const,
          createdBy: adminUser.id
        })
      }

      // Create assist events
      for (let i = 0; i < excelPlayer.assists; i++) {
        events.push({
          matchId: match.id,
          playerId: mapping.userId,
          eventType: 'ASSIST' as const,
          createdBy: adminUser.id
        })
      }
    }

    // Bulk create events
    if (events.length > 0) {
      await prisma.matchEvent.createMany({
        data: events
      })
    }

    await invalidateCacheTags([
      CACHE_TAGS.MATCHES,
      CACHE_TAGS.GAMES,
      CACHE_TAGS.PLAYERS,
      CACHE_TAGS.USERS,
      CACHE_TAGS.LEADERBOARD,
      CACHE_TAGS.STATS,
      CACHE_TAGS.STATISTICS
    ])

    return NextResponse.json({
      success: true,
      data: {
        match: {
          id: match.id,
          matchDate: match.matchDate,
          opponentTeam: match.opponentTeam,
          fieldFeeTotal: match.fieldFeeTotal,
          waterFeeTotal: match.waterFeeTotal,
          ourScore: match.ourScore,
          opponentScore: match.opponentScore
        },
        participations: participations.length,
        events: events.length,
        importSummary: {
          totalPlayersInExcel: excelData.players.length,
          matchedPlayers: matchedMappings.length,
          unknownPlayers: unmatchedPlayers.length,
          selectedPlayers: matchPlayerData.length,
          goalsImported: events.filter(e => e.eventType === 'GOAL').length,
          assistsImported: events.filter(e => e.eventType === 'ASSIST').length,
          calculatedCoefficient: coefficient
        },
        warnings: unmatchedPlayers.length > 0 ? [
          `发现${unmatchedPlayers.length}个未匹配球员: ${unmatchedPlayers.join(', ')}。这些球员的数据未导入，请为其分配shortId后重新导入。`
        ] : []
      }
    })

  } catch (error) {
    console.error('Excel import error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
