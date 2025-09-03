import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { parseExcelFile, ExcelPlayerData } from '@/lib/excelParser'

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
    
    // Create match record
    const match = await prisma.match.create({
      data: {
        matchDate: new Date(), // TODO: Extract date from Excel or allow user input
        opponentTeam: excelData.matchTitle.replace(/^\d+月\d+日VS/, '') || 'Unknown Team',
        ourScore: excelData.ourScore,
        opponentScore: excelData.opponentScore,
        fieldFeeTotal: excelData.fieldFeeTotal,
        waterFeeTotal: excelData.waterFeeTotal,
        feeCoefficient: excelData.feeCoefficient,
        notes: JSON.stringify({
          importedFrom: file.name,
          importedAt: new Date().toISOString(),
          originalSheetName: excelData.matchTitle
        }),
        createdBy: adminUser.id
      }
    })
    
    // Create participation records and events (only for matched players)
    const participations = []
    const events = []
    
    for (const mapping of matchedMappings) {
      
      const { excelPlayer } = mapping
      
      // Build attendance data JSON
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
        }
      }
      
      // Create participation record
      const participation = await prisma.matchParticipation.create({
        data: {
          userId: mapping.userId,
          matchId: match.id,
          attendanceData,
          isLateArrival: !excelPlayer.onTime,
          totalTime: excelPlayer.totalTime,
          fieldFeeCalculated: excelPlayer.fieldFee,
          lateFee: excelPlayer.lateFee,
          videoFee: excelPlayer.videoFee,
          totalFeeCalculated: excelPlayer.totalFeeCalculated,
          notes: excelPlayer.notes.trim() || null
        }
      })
      
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
          goalsImported: events.filter(e => e.eventType === 'GOAL').length,
          assistsImported: events.filter(e => e.eventType === 'ASSIST').length
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