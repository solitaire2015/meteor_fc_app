/**
 * Enhanced Attendance Service
 * 
 * Handles attendance validation and goalkeeper constraints including:
 * - Goalkeeper conflict detection and resolution
 * - Auto-unset logic for conflicting goalkeepers
 * - Attendance data validation
 * - Integration with fee recalculation
 */

import { prisma } from '@/lib/prisma'
import { type AttendanceData, calculatePlayerFees } from '@/lib/feeCalculation'
import { calculateCoefficient } from '@/lib/utils/coefficient'
import { EventType } from '@prisma/client'

export interface AttendanceUpdate {
  attendance: {
    [section: string]: {
      [part: string]: number
    }
  }
  goalkeeper: {
    [section: string]: {
      [part: string]: boolean
    }
  }
  isLateArrival: boolean
}

export interface AttendancePlayerData {
  [playerId: string]: AttendanceUpdate
}

export interface GoalkeeperConflict {
  section: number
  part: number
  existingGoalkeeperId: string
  existingGoalkeeperName: string
  newGoalkeeperId: string
  newGoalkeeperName: string
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  conflicts: GoalkeeperConflict[]
  resolvedData?: AttendancePlayerData
}

export interface AttendanceEvent {
  playerId: string
  eventType: EventType
  minute?: number
}

export interface AttendanceUpdateRequest {
  attendanceData: AttendancePlayerData
  events: AttendanceEvent[]
}

export class AttendanceService {
  /**
   * Validate attendance data and check for goalkeeper constraints
   */
  async validateAttendanceData(
    matchId: string,
    attendanceData: AttendancePlayerData,
    selectedPlayerIds: string[] = []
  ): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const conflicts: GoalkeeperConflict[] = []

    // 1. Filter out players not selected for this match (auto-cleanup)
    const selectedPlayerIdSet = new Set(selectedPlayerIds)
    const filteredAttendanceData: AttendancePlayerData = {}
    
    for (const [playerId, data] of Object.entries(attendanceData)) {
      if (selectedPlayerIdSet.has(playerId)) {
        filteredAttendanceData[playerId] = data
      }
    }
    
    // Use filtered data for all subsequent validation
    const playerIds = Object.keys(filteredAttendanceData)

    // Create a simple map for conflict resolution (we don't need full player data for validation)
    const selectedPlayerMap = new Map(
      selectedPlayerIds.map(id => [id, { id, name: `Player-${id}` }])
    )

    // 2. Validate attendance data structure
    for (const [playerId, data] of Object.entries(filteredAttendanceData)) {
      if (!this.validateAttendanceStructure(data)) {
        errors.push(`Invalid attendance data structure for player ${playerId}`)
      }
    }

    // 3. Check for goalkeeper conflicts
    const goalkeeperMap = new Map<string, string>() // key: "section-part", value: playerId

    for (const [playerId, data] of Object.entries(filteredAttendanceData)) {
      for (let section = 1; section <= 3; section++) {
        for (let part = 1; part <= 3; part++) {
          const sectionStr = section.toString()
          const partStr = part.toString()
          
          const isGoalkeeper = data.goalkeeper[sectionStr]?.[partStr] || false
          
          if (isGoalkeeper) {
            const key = `${section}-${part}`
            const existingPlayerId = goalkeeperMap.get(key)
            
            if (existingPlayerId && existingPlayerId !== playerId) {
              const existingPlayer = selectedPlayerMap.get(existingPlayerId)
              const currentPlayer = selectedPlayerMap.get(playerId)
              
              conflicts.push({
                section,
                part,
                existingGoalkeeperId: existingPlayerId,
                existingGoalkeeperName: existingPlayer?.name || 'Unknown',
                newGoalkeeperId: playerId,
                newGoalkeeperName: currentPlayer?.name || 'Unknown'
              })
            } else {
              goalkeeperMap.set(key, playerId)
            }
          }
        }
      }
    }

    // 4. Generate warnings for potential issues
    if (conflicts.length > 0) {
      warnings.push(`Found ${conflicts.length} goalkeeper conflict(s) that will be auto-resolved`)
    }

    // Return validation result
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      conflicts,
      resolvedData: conflicts.length > 0 ? 
        this.autoResolveGoalkeeperConflicts(filteredAttendanceData, conflicts) : 
        filteredAttendanceData
    }
  }

  /**
   * Auto-resolve goalkeeper conflicts by unsetting previous goalkeepers
   */
  autoResolveGoalkeeperConflicts(
    attendanceData: AttendancePlayerData,
    conflicts: GoalkeeperConflict[]
  ): AttendancePlayerData {
    const resolvedData = JSON.parse(JSON.stringify(attendanceData)) as AttendancePlayerData

    for (const conflict of conflicts) {
      const { section, part, existingGoalkeeperId } = conflict
      const sectionStr = section.toString()
      const partStr = part.toString()

      // Unset existing goalkeeper
      if (resolvedData[existingGoalkeeperId]) {
        resolvedData[existingGoalkeeperId].goalkeeper[sectionStr][partStr] = false
        
        // Set attendance to 0 for that part
        resolvedData[existingGoalkeeperId].attendance[sectionStr][partStr] = 0
      }
    }

    return resolvedData
  }

  /**
   * Update attendance data with goalkeeper validation and fee recalculation
   */
  async updateAttendance(
    matchId: string,
    updateRequest: AttendanceUpdateRequest,
    matchInfo: { fieldFeeTotal: number; waterFeeTotal: number; lateFeeRate?: number; videoFeePerUnit?: number },
    selectedPlayerIds: string[] = []
  ): Promise<{
    success: boolean
    data: {
      participationsCount: number
      eventsCount: number
      feeCoefficient: number
      conflictsResolved: number
      warnings: string[]
    }
  }> {
    // 1. Validate attendance data OUTSIDE the transaction (using provided selected player IDs to avoid DB query)
    const validation = await this.validateAttendanceData(matchId, updateRequest.attendanceData, selectedPlayerIds)
    
    if (!validation.isValid) {
      throw new Error(`Attendance validation failed: ${validation.errors.join(', ')}`)
    }

    // Use resolved data if conflicts were auto-resolved
    const finalAttendanceData = validation.resolvedData || updateRequest.attendanceData

    // 2. Calculate total play time and prepare participation data OUTSIDE transaction
    let totalPlayTime = 0
    const playerData = []

    for (const [playerId, data] of Object.entries(finalAttendanceData)) {
      let playerTotalTime = 0
      
      // Calculate total time for this player (only non-goalkeeper time)
      for (const section in data.attendance) {
        for (const part in data.attendance[section]) {
          const attendance = data.attendance[section][part]
          const isGoalkeeper = data.goalkeeper[section][part]
          
          // Only count non-goalkeeper time
          if (attendance > 0 && !isGoalkeeper) {
            playerTotalTime += attendance
          }
        }
      }
      
      totalPlayTime += playerTotalTime
      
      playerData.push({
        playerId,
        attendanceData: data,
        totalTime: playerTotalTime
      })
    }

    // 3. Calculate fee coefficient using the correct fixed denominator of 90
    const feeCoefficient = calculateCoefficient(
      matchInfo.fieldFeeTotal,
      matchInfo.waterFeeTotal,
      totalPlayTime // This parameter is not used in the calculation, but kept for compatibility
    )

    // 4. Prepare participation data structures OUTSIDE transaction
    const participations: {
      matchId: string
      userId: string
      attendanceData: any
      isLateArrival: boolean
      totalTime: number
      fieldFeeCalculated: number
      lateFee: number
      videoFee: number
      totalFeeCalculated: number
    }[] = []
    
    for (const player of playerData) {
      // Create participation records for ALL selected players, including those with totalTime = 0
      // This ensures goalkeepers and no-show players are still recorded in attendance data
      
      // Use the proper fee calculation logic with match-specific rates
      const calculatedFees = calculatePlayerFees({
        attendanceData: player.attendanceData as AttendanceData,
        isLateArrival: player.attendanceData.isLateArrival,
        feeCoefficient,
        lateFeeRate: matchInfo.lateFeeRate || 10,
        videoFeeRate: matchInfo.videoFeePerUnit || 2
      })
      
      participations.push({
        matchId,
        userId: player.playerId,
        attendanceData: player.attendanceData,
        isLateArrival: player.attendanceData.isLateArrival,
        totalTime: calculatedFees.normalPlayerParts,
        fieldFeeCalculated: calculatedFees.fieldFee,
        lateFee: calculatedFees.lateFee,
        videoFee: calculatedFees.videoFee,
        totalFeeCalculated: calculatedFees.totalFee
      })
    }

    const events: {
      matchId: string
      playerId: string
      eventType: EventType
      minute: number | null
      description: string
      createdBy: string
    }[] = []
    const defaultCreatorId = Object.keys(finalAttendanceData)[0] || 'system'
    
    for (const event of updateRequest.events) {
      events.push({
        matchId,
        playerId: event.playerId,
        eventType: event.eventType,
        minute: event.minute || null,
        description: `${event.eventType.toLowerCase()} by player`,
        createdBy: defaultCreatorId
      })
    }

    // 5. Execute ONLY data persistence in transaction (should be fast)
    return await prisma.$transaction(async (tx) => {
      // Clear existing data
      await tx.matchParticipation.deleteMany({
        where: { matchId }
      })

      await tx.matchEvent.deleteMany({
        where: { matchId }
      })

      // Create new participation records with pre-calculated fees
      if (participations.length > 0) {
        await tx.matchParticipation.createMany({
          data: participations
        })
      }

      // Create events
      if (events.length > 0) {
        await tx.matchEvent.createMany({
          data: events
        })
      }

      return {
        success: true,
        data: {
          participationsCount: participations.length,
          eventsCount: events.length,
          feeCoefficient: feeCoefficient,
          conflictsResolved: validation.conflicts.length,
          warnings: validation.warnings
        }
      }
    }, {
      timeout: 5000 // Reduced timeout since we're only doing simple data operations
    })
  }

  /**
   * Get current attendance data for a match
   */
  async getAttendanceData(matchId: string): Promise<{
    attendanceData: Record<string, any>
    eventsSummary: Record<string, { goals: number; assists: number }>
    totalParticipants: number
    totalEvents: number
    selectedPlayers: string[]
  }> {
    // Get selected players for this match
    const matchPlayers = await prisma.matchPlayer.findMany({
      where: { matchId },
      select: { playerId: true }
    })

    const selectedPlayers = matchPlayers.map(mp => mp.playerId)

    // Get attendance data from participations
    const participations = await prisma.matchParticipation.findMany({
      where: { matchId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            jerseyNumber: true,
            position: true
          }
        }
      }
    })

    // Get events for this match
    const events = await prisma.matchEvent.findMany({
      where: { matchId },
      include: {
        player: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Transform data to the expected format
    const attendanceData: Record<string, any> = {}
    
    for (const participation of participations) {
      attendanceData[participation.userId] = {
        ...participation.attendanceData,
        isLateArrival: participation.isLateArrival,
        user: participation.user
      }
    }

    // Count events by player and type
    const eventsSummary = events.reduce((acc, event) => {
      if (!acc[event.playerId]) {
        acc[event.playerId] = { goals: 0, assists: 0 }
      }
      
      if (event.eventType === 'GOAL' || event.eventType === 'PENALTY_GOAL') {
        acc[event.playerId].goals++
      } else if (event.eventType === 'ASSIST') {
        acc[event.playerId].assists++
      }
      
      return acc
    }, {} as Record<string, { goals: number; assists: number }>)

    return {
      attendanceData,
      eventsSummary,
      totalParticipants: participations.length,
      totalEvents: events.length,
      selectedPlayers
    }
  }

  /**
   * Validate attendance data structure
   */
  private validateAttendanceStructure(data: AttendanceUpdate): boolean {
    if (!data.attendance || !data.goalkeeper) {
      return false
    }

    if (typeof data.isLateArrival !== 'boolean') {
      return false
    }

    // Check structure for sections 1-3 and parts 1-3
    for (let section = 1; section <= 3; section++) {
      const sectionStr = section.toString()
      
      if (!data.attendance[sectionStr] || !data.goalkeeper[sectionStr]) {
        return false
      }
      
      for (let part = 1; part <= 3; part++) {
        const partStr = part.toString()
        
        const attendance = data.attendance[sectionStr][partStr]
        const goalkeeper = data.goalkeeper[sectionStr][partStr]
        
        if (typeof attendance !== 'number' || attendance < 0 || attendance > 1) {
          return false
        }
        
        if (typeof goalkeeper !== 'boolean') {
          return false
        }
        
        // If goalkeeper is true, attendance should be > 0
        if (goalkeeper && attendance === 0) {
          return false
        }
      }
    }

    return true
  }

  /**
   * Get goalkeeper conflicts for preview (without saving)
   */
  async previewGoalkeeperConflicts(
    matchId: string,
    attendanceData: AttendancePlayerData
  ): Promise<GoalkeeperConflict[]> {
    const validation = await this.validateAttendanceData(matchId, attendanceData)
    return validation.conflicts
  }
}

// Export singleton instance
export const attendanceService = new AttendanceService()