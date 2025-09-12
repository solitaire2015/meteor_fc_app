import * as XLSX from 'xlsx'

export interface ExcelPlayerData {
  序号: number
  姓名: string
  shortId: string
  section1: [number | string, number | string, number | string]
  section2: [number | string, number | string, number | string]
  section3: [number | string, number | string, number | string]
  totalTime: number
  fieldFee: number
  onTime: boolean
  lateFee: number
  videoFee: number
  totalFeeCalculated: number
  实收费用: number  // Actual fee collected (for manual overrides)
  notes: string
  goals: number
  assists: number
}

export interface ExcelMatchData {
  matchTitle: string
  fieldFeeTotal: number
  waterFeeTotal: number
  feeCoefficient: number
  ourScore: number | null
  opponentScore: number | null
  players: ExcelPlayerData[]
  unknownPlayers: string[]
  totalParticipants: number
}

/**
 * Parse Excel file buffer and extract match data
 */
export function parseExcelFile(buffer: Buffer): ExcelMatchData {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    
    // Use first sheet (should be the game data)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert to JSON with header row
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: null 
    }) as (string | number | null)[][]
    
    return parseExcelData(rawData, sheetName)
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Parse raw Excel data array into structured match data
 */
export function parseExcelData(rawData: (string | number | null)[][], sheetName: string): ExcelMatchData {
  if (!rawData || rawData.length < 4) {
    throw new Error('Excel file appears to be empty or invalid')
  }
  
  // Find the data rows (skip header rows)
  // Looking for first row with numeric 序号
  let dataStartRow = -1
  const hasShortIdColumn = rawData[0] && rawData[0][1] === 'shortId'
  
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i]
    // Check if this is a data row: has numeric first column
    if (row[0] && typeof row[0] === 'number') {
      // Check name column based on structure
      const nameCol = hasShortIdColumn ? 2 : 1
      if (row[nameCol] && typeof row[nameCol] === 'string' && 
          row[nameCol] !== '姓名' && row[nameCol] !== '合计') {
        dataStartRow = i
        break
      }
    }
  }
  
  if (dataStartRow === -1) {
    throw new Error('Could not find data rows in Excel file')
  }
  
  // Find totals row (last row with '合计')
  let totalsRowIndex = -1
  for (let i = rawData.length - 1; i >= 0; i--) {
    const row = rawData[i]
    // Check both column 1 and 2 depending on structure
    const checkCol = hasShortIdColumn ? 2 : 1
    if (row[checkCol] === '合计') {
      totalsRowIndex = i
      break
    }
  }
  
  const players: ExcelPlayerData[] = []
  const unknownPlayers: string[] = []
  
  // Parse player data rows
  
  for (let i = dataStartRow; i < (totalsRowIndex > 0 ? totalsRowIndex : rawData.length); i++) {
    const row = rawData[i]
    
    let shortId = ''
    let playerName = ''
    let attendanceStartCol = 2  // Default start column for attendance data
    
    if (hasShortIdColumn) {
      // With shortId: Column 1 is shortId, Column 2 is name
      if (!row[2] || typeof row[2] !== 'string') continue
      shortId = row[1] ? row[1].toString().trim() : ''
      playerName = row[2].toString().trim()
      attendanceStartCol = 3
    } else {
      // Without shortId: Column 1 is name
      if (!row[1] || typeof row[1] !== 'string') continue
      playerName = row[1].toString().trim()
      attendanceStartCol = 2
    }
    
    try {
      // Parse attendance data (sections 1-3, parts 1-3)
      const section1: [number | string, number | string, number | string] = [
        parseAttendanceValue(row[attendanceStartCol]), 
        parseAttendanceValue(row[attendanceStartCol + 1]),
        parseAttendanceValue(row[attendanceStartCol + 2])
      ]
      
      const section2: [number | string, number | string, number | string] = [
        parseAttendanceValue(row[attendanceStartCol + 3]),
        parseAttendanceValue(row[attendanceStartCol + 4]),
        parseAttendanceValue(row[attendanceStartCol + 5])
      ]
      
      const section3: [number | string, number | string, number | string] = [
        parseAttendanceValue(row[attendanceStartCol + 6]),
        parseAttendanceValue(row[attendanceStartCol + 7]),
        parseAttendanceValue(row[attendanceStartCol + 8])
      ]
      
      // Parse goals and assists from the last column
      const { goals, assists } = parseGoalsAssists(row[row.length - 1])
      
      // Column indices for other fields depend on whether shortId column exists
      // When shortId exists, all columns shift right by 1
      const totalTimeCol = hasShortIdColumn ? 12 : 11
      const feeCoefCol = hasShortIdColumn ? 13 : 12
      const fieldFeeCol = hasShortIdColumn ? 14 : 13
      const onTimeCol = hasShortIdColumn ? 15 : 14
      const lateFeeCol = hasShortIdColumn ? 17 : 16
      const videoFeeCol = hasShortIdColumn ? 18 : 17
      const actualFeeCol = hasShortIdColumn ? 19 : 18  // 实收费用 column (actual fee collected)
      const notesCol = hasShortIdColumn ? 20 : 19
      
      // Parse late arrival status - onTimeCol is "准时到场" (1 = on time)
      const onTime = row[onTimeCol] === 1
      
      const playerData: ExcelPlayerData = {
        序号: parseFloat(row[0]?.toString() || '0') || 0,
        姓名: playerName,
        shortId: shortId,
        section1,
        section2,
        section3,
        totalTime: parseFloat(row[totalTimeCol]?.toString() || '0') || 0,
        fieldFee: parseFloat(row[fieldFeeCol]?.toString() || '0') || 0,
        onTime,
        lateFee: parseFloat(row[lateFeeCol]?.toString() || '0') || 0,
        videoFee: parseFloat(row[videoFeeCol]?.toString() || '0') || 0,
        实收费用: parseFloat(row[actualFeeCol]?.toString() || '0') || 0,
        totalFeeCalculated: parseFloat(row[actualFeeCol]?.toString() || '0') || 0,  // Use actual fee as calculated fee
        notes: (row[notesCol] || '').toString().trim(),
        goals,
        assists
      }
      
      players.push(playerData)
      
    } catch (error) {
      console.warn(`Failed to parse player: ${row[1]}`, error)
      unknownPlayers.push(row[1]?.toString() || 'Unknown')
    }
  }
  
  // Extract match-level data from totals row and header
  let fieldFeeTotal = 0
  let waterFeeTotal = 0
  let feeCoefficient = 0
  let ourScore: number | null = null
  let opponentScore: number | null = null
  
  // Extract scores from header row (row 0, last column)
  // Look for the column header that contains the score pattern
  const headerRow = rawData[0]
  if (headerRow) {
    for (let col = headerRow.length - 1; col >= 0; col--) {
      if (headerRow[col] && typeof headerRow[col] === 'string') {
        const scoreMatch = (headerRow[col] as string).match(/(\d+):(\d+)/)
        if (scoreMatch) {
          ourScore = parseInt(scoreMatch[1]) || null
          opponentScore = parseInt(scoreMatch[2]) || null
          break
        }
      }
    }
  }
  
  // Extract fees from totals row
  if (totalsRowIndex >= 0) {
    const totalsRow = rawData[totalsRowIndex]
    
    // Try the new format first: field fee in second-to-last column, water fee in last column
    const secondToLastCol = totalsRow[totalsRow.length - 2]
    const lastCol = totalsRow[totalsRow.length - 1]
    
    if ((typeof secondToLastCol === 'number' || !isNaN(parseFloat(secondToLastCol?.toString() || '0'))) && 
        (typeof lastCol === 'number' || !isNaN(parseFloat(lastCol?.toString() || '0')))) {
      // New format with separate columns
      fieldFeeTotal = typeof secondToLastCol === 'number' ? secondToLastCol : parseFloat(secondToLastCol?.toString() || '0')
      waterFeeTotal = typeof lastCol === 'number' ? lastCol : parseFloat(lastCol?.toString() || '0')
    } else {
      // Fall back to old format: parse from column 19/20 (备注) "场地1100+水费50"
      const notesCol = hasShortIdColumn ? 20 : 19
      const notesCell = totalsRow[notesCol]
      if (notesCell && typeof notesCell === 'string') {
        const match = notesCell.match(/场地(\d+)\+?.*?水费(\d+)/)
        if (match) {
          fieldFeeTotal = parseInt(match[1]) || 0
          waterFeeTotal = parseInt(match[2]) || 0
        }
      }
    }
  }
  
  // Fee coefficient from any player row
  if (dataStartRow >= 0) {
    const firstPlayerRow = rawData[dataStartRow]
    const feeCoefCol = hasShortIdColumn ? 13 : 12
    if (firstPlayerRow[feeCoefCol] && typeof firstPlayerRow[feeCoefCol] === 'number') {
      feeCoefficient = firstPlayerRow[feeCoefCol]
    }
  }
  
  return {
    matchTitle: sheetName,
    fieldFeeTotal,
    waterFeeTotal,
    feeCoefficient,
    ourScore,
    opponentScore,
    players,
    unknownPlayers,
    totalParticipants: players.length
  }
}

/**
 * Parse attendance value (1, 0.5, '守门', null/undefined -> 0)
 */
function parseAttendanceValue(value: string | number | null | undefined): number | string {
  if (value === null || value === undefined || value === '') {
    return 0
  }
  
  if (typeof value === 'string') {
    if (value === '守门') {
      return '守门'
    }
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }
  
  if (typeof value === 'number') {
    return value
  }
  
  return 0
}

/**
 * Parse goals and assists from Excel cell (e.g., "进球1 助攻1", "进球1", "助攻1")
 */
function parseGoalsAssists(value: string | number | null | undefined): { goals: number; assists: number } {
  let goals = 0
  let assists = 0
  
  if (!value || typeof value !== 'string') {
    return { goals, assists }
  }
  
  // Match patterns like "进球1", "助攻1"
  const goalMatch = value.match(/进球(\d+)/)
  const assistMatch = value.match(/助攻(\d+)/)
  
  if (goalMatch) {
    goals = parseInt(goalMatch[1]) || 0
  }
  
  if (assistMatch) {
    assists = parseInt(assistMatch[1]) || 0
  }
  
  return { goals, assists }
}

