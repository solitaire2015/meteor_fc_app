import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'
import { calculateCoefficient } from '@/lib/utils/coefficient'

const prisma = new PrismaClient()

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
    
    // Header rows
    excelData.push([
      '', '', '', '第一节', '', '', '第二节', '', '', '第三节', '', '', '', '', '', '', '', '', '', '', '', 
      `进球助攻 ${match.ourScore || 0}:${match.opponentScore || 0}`
    ])
    excelData.push([
      '序号', '短编号', '姓名', '1', '2', '3', '1', '2', '3', '1', '2', '3', '是否迟到', '实收费用', 
      '合计时间单位', '费用系数', '场地费用', '迟到罚款', '录像费用', '备注', '进球助攻'
    ])
    
    // Calculate real-time coefficient
    const totalPlayTime = match.participations.reduce((sum, p) => sum + Number(p.totalTime), 0)
    const realTimeCoefficient = calculateCoefficient(
      Number(match.fieldFeeTotal),
      Number(match.waterFeeTotal),
      totalPlayTime
    )

    // Process player data with fee override logic
    const participationsWithFees: any[] = []
    
    match.participations.forEach((participation, index) => {
      const attendanceData = participation.attendanceData as any
      const attendance = attendanceData?.attendance || {}
      const goalkeeper = attendanceData?.goalkeeper || {}
      
      // Parse attendance for each section/part
      const section1 = [
        goalkeeper['1']?.['1'] ? '守门' : (attendance['1']?.['1'] || 0),
        goalkeeper['1']?.['2'] ? '守门' : (attendance['1']?.['2'] || 0),
        goalkeeper['1']?.['3'] ? '守门' : (attendance['1']?.['3'] || 0)
      ]
      
      const section2 = [
        goalkeeper['2']?.['1'] ? '守门' : (attendance['2']?.['1'] || 0),
        goalkeeper['2']?.['2'] ? '守门' : (attendance['2']?.['2'] || 0),
        goalkeeper['2']?.['3'] ? '守门' : (attendance['2']?.['3'] || 0)
      ]
      
      const section3 = [
        goalkeeper['3']?.['1'] ? '守门' : (attendance['3']?.['1'] || 0),
        goalkeeper['3']?.['2'] ? '守门' : (attendance['3']?.['2'] || 0),
        goalkeeper['3']?.['3'] ? '守门' : (attendance['3']?.['3'] || 0)
      ]
      
      // Find fee override for this player (same logic as match detail page)
      const playerOverride = match.feeOverrides.find((override: any) => override.playerId === participation.userId)
      
      // Calculate final fees - use override if available, otherwise use calculated
      let finalFieldFee = Number(participation.fieldFeeCalculated)
      let finalVideoFee = Number(participation.videoFee)
      let finalLateFee = participation.isLateArrival && Number(participation.totalTime) > 0 ? Number(participation.lateFee) : 0
      let finalActualFee = Number(participation.totalFeeCalculated)
      let notes = ''
      
      if (playerOverride) {
        // Use override fees and calculate total
        finalFieldFee = Number(playerOverride.fieldFeeOverride || 0)
        finalVideoFee = Number(playerOverride.videoFeeOverride || 0)
        finalLateFee = Number(playerOverride.lateFeeOverride || 0)
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
      
      excelData.push([
        index + 1,                                    // 序号
        participation.user.shortId || '',             // 短编号
        participation.user.name,                      // 姓名
        section1[0], section1[1], section1[2],       // 第一节
        section2[0], section2[1], section2[2],       // 第二节
        section3[0], section3[1], section3[2],       // 第三节
        participation.isLateArrival ? '迟到' : '',    // 是否迟到
        Number(finalActualFee.toFixed(2)),           // 实收费用 (override logic)
        Number(participation.totalTime),              // 合计时间单位
        Number(realTimeCoefficient.toFixed(4)),      // 费用系数
        Number(finalFieldFee.toFixed(2)),            // 场地费用 (override logic)
        Number(finalLateFee.toFixed(2)),             // 迟到罚款 (override logic)
        Number(finalVideoFee.toFixed(2)),            // 录像费用 (override logic)
        notes,                                       // 备注 (from override)
        goalsAssistsStr                              // 进球助攻
      ])
    })
    
    // Totals row using actual fees (override or calculated)
    const totalFieldFee = Number(match.fieldFeeTotal)
    const totalWaterFee = Number(match.waterFeeTotal)
    const totalTime = participationsWithFees.reduce((sum, p) => sum + Number(p.totalTime), 0)
    const totalActualFieldFee = participationsWithFees.reduce((sum, p) => sum + p.finalFieldFee, 0)
    const totalActualLateFee = participationsWithFees.reduce((sum, p) => sum + p.finalLateFee, 0)
    const totalActualVideoFee = participationsWithFees.reduce((sum, p) => sum + p.finalVideoFee, 0)
    const totalActualFee = participationsWithFees.reduce((sum, p) => sum + p.finalActualFee, 0)
    
    excelData.push([
      '',                                      // 序号
      '',                                      // 短编号  
      '合计',                                  // 姓名
      '', '', '',                             // 第一节 (3 columns)
      '', '', '',                             // 第二节 (3 columns) 
      '', '', '',                             // 第三节 (3 columns)
      '',                                      // 是否迟到
      Number(totalActualFee.toFixed(2)),      // 实收费用
      totalTime,                              // 合计时间单位
      '',                                      // 费用系数
      Number(totalActualFieldFee.toFixed(2)), // 场地费用
      Number(totalActualLateFee.toFixed(2)),  // 迟到罚款
      Number(totalActualVideoFee.toFixed(2)), // 录像费用
      `场地${totalFieldFee}+水费${totalWaterFee}`, // 备注
      ''                                       // 进球助攻
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