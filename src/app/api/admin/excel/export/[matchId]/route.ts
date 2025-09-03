import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const { matchId } = params
    
    // Fetch match data with participations and events
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
      '', '', '第一节', '', '', '第二节', '', '', '第三节', '', '', '', '', '', '', '', '', '', '', '', 
      `进球助攻 ${match.ourScore || 0}:${match.opponentScore || 0}`
    ])
    excelData.push([
      '序号', '姓名', '1', '2', '3', '1', '2', '3', '1', '2', '3', '合计', '费用系数', '场地费用', 
      '准时到场', '迟到情况', '迟到罚款', '录像费用', '实收费用', '备注', ''
    ])
    
    // Player data rows
    match.participations.forEach((participation, index) => {
      const attendanceData = participation.attendanceData as any
      const attendance = attendanceData?.attendance || {}
      const goalkeeper = attendanceData?.goalkeeper || {}
      
      // Parse attendance for each section/part
      const section1 = [
        goalkeeper['1']?.['1'] ? '守门' : (attendance['1']?.['1'] || ''),
        goalkeeper['1']?.['2'] ? '守门' : (attendance['1']?.['2'] || ''),
        goalkeeper['1']?.['3'] ? '守门' : (attendance['1']?.['3'] || '')
      ]
      
      const section2 = [
        goalkeeper['2']?.['1'] ? '守门' : (attendance['2']?.['1'] || ''),
        goalkeeper['2']?.['2'] ? '守门' : (attendance['2']?.['2'] || ''),
        goalkeeper['2']?.['3'] ? '守门' : (attendance['2']?.['3'] || '')
      ]
      
      const section3 = [
        goalkeeper['3']?.['1'] ? '守门' : (attendance['3']?.['1'] || ''),
        goalkeeper['3']?.['2'] ? '守门' : (attendance['3']?.['2'] || ''),
        goalkeeper['3']?.['3'] ? '守门' : (attendance['3']?.['3'] || '')
      ]
      
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
        participation.user.name,                      // 姓名
        section1[0], section1[1], section1[2],       // 第一节
        section2[0], section2[1], section2[2],       // 第二节
        section3[0], section3[1], section3[2],       // 第三节
        Number(participation.totalTime),              // 合计
        Number(match.feeCoefficient),                 // 费用系数
        Number(participation.fieldFeeCalculated),     // 场地费用
        participation.isLateArrival ? '' : 1,         // 准时到场
        participation.notes?.includes('观战') ? '观战' : '', // 迟到情况
        Number(participation.lateFee),                // 迟到罚款
        Number(participation.videoFee),               // 录像费用
        Number(participation.totalFeeCalculated),     // 实收费用
        participation.notes || '',                    // 备注
        goalsAssistsStr                              // 进球助攻
      ])
    })
    
    // Totals row
    const totalFieldFee = Number(match.fieldFeeTotal)
    const totalWaterFee = Number(match.waterFeeTotal)
    const totalTime = match.participations.reduce((sum, p) => sum + Number(p.totalTime), 0)
    const totalCalculatedFieldFee = match.participations.reduce((sum, p) => sum + Number(p.fieldFeeCalculated), 0)
    const totalLateFee = match.participations.reduce((sum, p) => sum + Number(p.lateFee), 0)
    const totalVideoFee = match.participations.reduce((sum, p) => sum + Number(p.videoFee), 0)
    const totalActualFee = match.participations.reduce((sum, p) => sum + Number(p.totalFeeCalculated), 0)
    
    excelData.push([
      '', '合计', '', '', '', '', '', '', '', '', '', 
      totalTime,
      '',
      totalCalculatedFieldFee,
      '',
      '',
      totalLateFee,
      totalVideoFee,
      totalActualFee,
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