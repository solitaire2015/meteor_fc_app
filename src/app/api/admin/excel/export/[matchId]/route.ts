import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'
import { calculateCoefficient } from '@/lib/utils/coefficient'

const prisma = new PrismaClient()
const roundFee = (value: number) => Math.ceil(value)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params
    
    // Fetch match data with participations, events, and fee overrides
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        participations: {
          include: {
            user: {
              select: { id: true, name: true, shortId: true }
            }
          }
        },
        events: {
          include: {
            player: {
              select: { id: true, name: true, shortId: true }
            }
          }
        },
        feeOverrides: {
          include: {
            player: {
              select: { id: true, name: true, shortId: true }
            }
          }
        }
      }
    })
    
    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      )
    }
    
    // Aggregate events by player
    const playerEvents: Record<string, { goals: number; assists: number }> = {}
    
    match.events.forEach(event => {
      const playerId = event.playerId
      if (!playerEvents[playerId]) {
        playerEvents[playerId] = { goals: 0, assists: 0 }
      }
      
      if (event.eventType === 'GOAL' || event.eventType === 'PENALTY_GOAL') {
        playerEvents[playerId].goals++
      } else if (event.eventType === 'ASSIST') {
        playerEvents[playerId].assists++
      }
    })
    
    // Create Excel data structure
    const excelData: any[][] = []
    
    // Header rows (dynamic sections)
    const sectionCount = Number((match as any).sectionCount || 3)

    const headerRow1: any[] = ['', '', '']
    for (let s = 1; s <= sectionCount; s++) {
      headerRow1.push(`第${s}节`, '', '')
    }
    // Pad columns before the final "进球助攻" cell (keep same shape as headerRow2)
    headerRow1.push(
      '', // 是否迟到
      '', // 实收费用
      '', // 合计时间单位
      '', // 费用系数
      '', // 场地费用
      '', // 迟到罚款
      '', // 录像费用
      '', // 备注
      `进球助攻 ${match.ourScore || 0}:${match.opponentScore || 0}`
    )
    excelData.push(headerRow1)

    const headerRow2: any[] = ['序号', '短编号', '姓名']
    for (let s = 1; s <= sectionCount; s++) {
      headerRow2.push('1', '2', '3')
    }
    headerRow2.push(
      '是否迟到',
      '实收费用',
      '合计时间单位',
      '费用系数',
      '场地费用',
      '迟到罚款',
      '录像费用',
      '备注',
      '进球助攻'
    )
    excelData.push(headerRow2)
    
    // Calculate coefficient (depends on sectionCount)
    const realTimeCoefficient = calculateCoefficient(
      Number(match.fieldFeeTotal),
      Number(match.waterFeeTotal),
      sectionCount
    )

    // Process player data with fee override logic
    const participationsWithFees: any[] = []
    
    match.participations.forEach((participation, index) => {
      const attendanceData = participation.attendanceData as any
      const attendance = attendanceData?.attendance || {}
      const goalkeeper = attendanceData?.goalkeeper || {}
      
      // Parse attendance for each section/part (dynamic sections)
      const sectionColumns: any[] = []
      for (let s = 1; s <= sectionCount; s++) {
        for (let p = 1; p <= 3; p++) {
          const sKey = String(s)
          const pKey = String(p)
          const isGK = Boolean(goalkeeper?.[sKey]?.[pKey])
          sectionColumns.push(isGK ? '守门' : (attendance?.[sKey]?.[pKey] ?? 0))
        }
      }
      
      // Find fee override for this player (same logic as match detail page)
      const playerOverride = match.feeOverrides.find((override: any) => override.playerId === participation.userId)
      
      // Calculate final fees - use override if available, otherwise use calculated
      let finalFieldFee = roundFee(Number(participation.fieldFeeCalculated))
      let finalVideoFee = roundFee(Number(participation.videoFee))
      let finalLateFee = participation.isLateArrival && Number(participation.totalTime) > 0
        ? roundFee(Number(participation.lateFee))
        : 0
      let finalActualFee = finalFieldFee + finalVideoFee + finalLateFee
      let notes = ''
      
      if (playerOverride) {
        // Use override fees and calculate total
        finalFieldFee = roundFee(Number(playerOverride.fieldFeeOverride || 0))
        finalVideoFee = roundFee(Number(playerOverride.videoFeeOverride || 0))
        finalLateFee = roundFee(Number(playerOverride.lateFeeOverride || 0))
        finalActualFee = finalFieldFee + finalVideoFee + finalLateFee
        notes = playerOverride.notes || ''
      }
      
      // Store processed data for totals calculation
      participationsWithFees.push({
        ...participation,
        finalFieldFee,
        finalVideoFee, 
        finalLateFee,
        finalActualFee,
        notes
      })
      
      // Get player events
      const events = playerEvents[participation.userId] || { goals: 0, assists: 0 }
      
      // Format goals/assists string
      let goalsAssistsStr = ''
      if (events.goals > 0) goalsAssistsStr += `进球${events.goals}`
      if (events.assists > 0) {
        if (goalsAssistsStr) goalsAssistsStr += ' '
        goalsAssistsStr += `助攻${events.assists}`
      }
      
      const lateLabel = participation.isLateArrival && Number(participation.totalTime) > 0 ? '迟到' : ''

      excelData.push([
        index + 1,                          // 序号
        participation.user.shortId || '',   // 短编号
        participation.user.name,            // 姓名
        ...sectionColumns,                  // 出勤 (dynamic sections)
        lateLabel,                          // 是否迟到
        finalActualFee,                     // 实收费用 (override logic)
        Number(participation.totalTime),    // 合计时间单位
        Number(realTimeCoefficient.toFixed(4)), // 费用系数
        finalFieldFee,                      // 场地费用 (override logic)
        finalLateFee,                       // 迟到罚款 (override logic)
        finalVideoFee,                      // 录像费用 (override logic)
        notes,                              // 备注 (from override)
        goalsAssistsStr                     // 进球助攻
      ])
    })
    
    // Totals row using actual fees (override or calculated)
    const totalFieldFee = roundFee(Number(match.fieldFeeTotal))
    const totalWaterFee = roundFee(Number(match.waterFeeTotal))
    const totalTime = participationsWithFees.reduce((sum, p) => sum + Number(p.totalTime), 0)
    const totalActualFieldFee = participationsWithFees.reduce((sum, p) => sum + p.finalFieldFee, 0)
    const totalActualLateFee = participationsWithFees.reduce((sum, p) => sum + p.finalLateFee, 0)
    const totalActualVideoFee = participationsWithFees.reduce((sum, p) => sum + p.finalVideoFee, 0)
    const totalActualFee = participationsWithFees.reduce((sum, p) => sum + p.finalActualFee, 0)
    
    excelData.push([
      '',
      '',
      '合计',
      ...Array(sectionCount * 3).fill(''),
      '',
      totalActualFee,
      totalTime,
      '',
      totalActualFieldFee,
      totalActualLateFee,
      totalActualVideoFee,
      `场地${totalFieldFee}+水费${totalWaterFee}`,
      ''
    ])
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(excelData)
    
    // Format date for sheet name
    const matchDate = new Date(match.matchDate)
    const formattedDate = `${matchDate.getMonth() + 1}月${matchDate.getDate()}日`
    const sheetName = `${formattedDate}VS${match.opponentTeam}`
    
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    
    // Generate Excel buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    
    // Create filename
    const filename = `${sheetName}_导出.xlsx`
    
    // Return Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': excelBuffer.length.toString()
      }
    })
    
  } catch (error) {
    console.error('Excel export error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
}
