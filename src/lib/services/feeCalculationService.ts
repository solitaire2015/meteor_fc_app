/**
 * Enhanced Fee Calculation Service
 * 
 * Centralized service for all fee calculation operations including:
 * - Real-time fee calculations
 * - Manual override management
 * - Auto-recalculation triggers
 * - Fee breakdown generation
 */

import { prisma } from '@/lib/prisma'
import { calculatePlayerFees, type AttendanceData, type FeeCalculationResult } from '@/lib/feeCalculation'
import { calculateCoefficient } from '@/lib/utils/coefficient'

export interface FeeOverride {
  fieldFeeOverride?: number | null
  videoFeeOverride?: number | null
  lateFeeOverride?: number | null
  notes?: string
}

export interface PlayerFeeBreakdown {
  playerId: string
  playerName: string
  totalTime: number
  isLateArrival: boolean
  calculatedFees: FeeCalculationResult
  overrides: FeeOverride | null
  finalFees: {
    fieldFee: number
    videoFee: number
    lateFee: number
    totalFee: number
  }
}

export interface MatchFeeBreakdown {
  matchId: string
  totalParticipants: number
  totalCalculatedFees: number
  totalFinalFees: number
  feeCoefficient: number
  players: PlayerFeeBreakdown[]
}

export class FeeCalculationService {
  /**
   * Calculate fees for a specific player in a match
   */
  async calculatePlayerFees(
    matchId: string, 
    playerId: string, 
    attendanceData: AttendanceData, 
    isLateArrival: boolean
  ): Promise<PlayerFeeBreakdown> {
    // Get match info for coefficient calculation
    const match = await prisma.match.findUnique({
      where: { id: matchId }
    })

    if (!match) {
      throw new Error(`Match ${matchId} not found`)
    }

    // Get player info
    const player = await prisma.user.findUnique({
      where: { id: playerId },
      select: { id: true, name: true }
    })

    if (!player) {
      throw new Error(`Player ${playerId} not found`)
    }

    // Calculate total play time for coefficient
    const totalPlayTime = await this.calculateTotalPlayTime(matchId)
    
    // Calculate coefficient
    const feeCoefficient = calculateCoefficient(
      Number(match.fieldFeeTotal),
      Number(match.waterFeeTotal),
      totalPlayTime
    )

    // Calculate base fees using match-specific rates
    const calculatedFees = calculatePlayerFees({
      attendanceData,
      isLateArrival,
      feeCoefficient,
      lateFeeRate: Number(match.lateFeeRate),
      videoFeeRate: Number(match.videoFeePerUnit)
    })

    // Get any existing overrides
    const override = await prisma.feeOverride.findUnique({
      where: {
        matchId_playerId: {
          matchId,
          playerId
        }
      }
    })

    // Apply overrides to get final fees
    const finalFieldFee = override?.fieldFeeOverride ?? calculatedFees.fieldFee
    const finalVideoFee = override?.videoFeeOverride ?? calculatedFees.videoFee
    const finalLateFee = override?.lateFeeOverride ?? calculatedFees.lateFee
    const finalTotalFee = finalFieldFee + finalVideoFee + finalLateFee

    return {
      playerId,
      playerName: player.name,
      totalTime: calculatedFees.normalPlayerParts,
      isLateArrival,
      calculatedFees,
      overrides: override ? {
        fieldFeeOverride: override.fieldFeeOverride ? Number(override.fieldFeeOverride) : null,
        videoFeeOverride: override.videoFeeOverride ? Number(override.videoFeeOverride) : null,
        lateFeeOverride: override.lateFeeOverride ? Number(override.lateFeeOverride) : null,
        notes: override.notes || undefined
      } : null,
      finalFees: {
        fieldFee: finalFieldFee,
        videoFee: finalVideoFee,
        lateFee: finalLateFee,
        totalFee: finalTotalFee
      }
    }
  }

  /**
   * Recalculate all fees for a match while preserving manual overrides
   */
  async recalculateAllFees(matchId: string): Promise<MatchFeeBreakdown> {
    return await prisma.$transaction(async (tx) => {
      // Get match info
      const match = await tx.match.findUnique({
        where: { id: matchId }
      })

      if (!match) {
        throw new Error(`Match ${matchId} not found`)
      }

      // Get all participations
      const participations = await tx.matchParticipation.findMany({
        where: { matchId },
        include: {
          user: {
            select: { id: true, name: true }
          }
        }
      })

      // Calculate total play time for coefficient
      const totalPlayTime = participations.reduce((sum, p) => sum + Number(p.totalTime), 0)
      
      // Calculate coefficient
      const feeCoefficient = calculateCoefficient(
        Number(match.fieldFeeTotal),
        Number(match.waterFeeTotal),
        totalPlayTime
      )

      // Get all existing overrides
      const existingOverrides = await tx.feeOverride.findMany({
        where: { matchId }
      })

      const overrideMap = new Map(
        existingOverrides.map(o => [o.playerId, o])
      )

      // Recalculate fees for each player
      const players: PlayerFeeBreakdown[] = []
      let totalCalculatedFees = 0
      let totalFinalFees = 0

      for (const participation of participations) {
        const attendanceData = participation.attendanceData as unknown as AttendanceData
        
        // Calculate base fees using match-specific rates
        const calculatedFees = calculatePlayerFees({
          attendanceData,
          isLateArrival: participation.isLateArrival,
          feeCoefficient,
          lateFeeRate: Number(match.lateFeeRate),
          videoFeeRate: Number(match.videoFeePerUnit)
        })

        const override = overrideMap.get(participation.userId)

        // Apply overrides to get final fees
        const finalFieldFee = override?.fieldFeeOverride ? Number(override.fieldFeeOverride) : calculatedFees.fieldFee
        const finalVideoFee = override?.videoFeeOverride ? Number(override.videoFeeOverride) : calculatedFees.videoFee
        const finalLateFee = override?.lateFeeOverride ? Number(override.lateFeeOverride) : calculatedFees.lateFee
        const finalTotalFee = finalFieldFee + finalVideoFee + finalLateFee

        // Update participation with new calculated fees
        await tx.matchParticipation.update({
          where: {
            userId_matchId: {
              userId: participation.userId,
              matchId
            }
          },
          data: {
            fieldFeeCalculated: finalFieldFee,
            videoFee: finalVideoFee,
            lateFee: finalLateFee,
            totalFeeCalculated: finalTotalFee,
            totalTime: calculatedFees.normalPlayerParts
          }
        })

        players.push({
          playerId: participation.userId,
          playerName: participation.user.name,
          totalTime: calculatedFees.normalPlayerParts,
          isLateArrival: participation.isLateArrival,
          calculatedFees,
          overrides: override ? {
            fieldFeeOverride: override.fieldFeeOverride ? Number(override.fieldFeeOverride) : null,
            videoFeeOverride: override.videoFeeOverride ? Number(override.videoFeeOverride) : null,
            lateFeeOverride: override.lateFeeOverride ? Number(override.lateFeeOverride) : null,
            notes: override.notes
          } : null,
          finalFees: {
            fieldFee: finalFieldFee,
            videoFee: finalVideoFee,
            lateFee: finalLateFee,
            totalFee: finalTotalFee
          }
        })

        totalCalculatedFees += calculatedFees.totalFee
        totalFinalFees += finalTotalFee
      }

      return {
        matchId,
        totalParticipants: participations.length,
        totalCalculatedFees,
        totalFinalFees,
        feeCoefficient,
        players
      }
    })
  }

  /**
   * Apply manual override to a player's fees
   */
  async applyManualOverride(
    matchId: string, 
    playerId: string, 
    override: FeeOverride
  ): Promise<PlayerFeeBreakdown> {
    return await prisma.$transaction(async (tx) => {
      // Verify participation exists
      const participation = await tx.matchParticipation.findUnique({
        where: {
          userId_matchId: {
            userId: playerId,
            matchId
          }
        },
        include: {
          user: {
            select: { id: true, name: true }
          }
        }
      })

      if (!participation) {
        throw new Error(`Player ${playerId} has no participation record for match ${matchId}`)
      }

      // Get match info
      const match = await tx.match.findUnique({
        where: { id: matchId }
      })

      if (!match) {
        throw new Error(`Match ${matchId} not found`)
      }

      // Calculate base fees
      const attendanceData = participation.attendanceData as unknown as AttendanceData
      const totalPlayTime = await this.calculateTotalPlayTime(matchId)
      const feeCoefficient = calculateCoefficient(
        Number(match.fieldFeeTotal),
        Number(match.waterFeeTotal),
        totalPlayTime
      )

      const calculatedFees = calculatePlayerFees({
        attendanceData,
        isLateArrival: participation.isLateArrival,
        feeCoefficient,
        lateFeeRate: Number(match.lateFeeRate),
        videoFeeRate: Number(match.videoFeePerUnit)
      })

      // Create or update fee override
      const feeOverride = await tx.feeOverride.upsert({
        where: {
          matchId_playerId: {
            matchId,
            playerId
          }
        },
        update: {
          fieldFeeOverride: override.fieldFeeOverride,
          videoFeeOverride: override.videoFeeOverride,
          lateFeeOverride: override.lateFeeOverride,
          notes: override.notes,
          updatedAt: new Date()
        },
        create: {
          matchId,
          playerId,
          fieldFeeOverride: override.fieldFeeOverride,
          videoFeeOverride: override.videoFeeOverride,
          lateFeeOverride: override.lateFeeOverride,
          notes: override.notes
        }
      })

      // Apply overrides to get final fees for return value only
      const finalFieldFee = override.fieldFeeOverride ?? calculatedFees.fieldFee
      const finalVideoFee = override.videoFeeOverride ?? calculatedFees.videoFee
      const finalLateFee = override.lateFeeOverride ?? calculatedFees.lateFee
      const finalTotalFee = finalFieldFee + finalVideoFee + finalLateFee

      // DO NOT UPDATE match_participation table - it should only contain calculated fees!
      // The fee_override table (created above) contains the manual overrides
      // The display logic will combine calculated + override as needed

      return {
        playerId,
        playerName: participation.user.name,
        totalTime: calculatedFees.normalPlayerParts,
        isLateArrival: participation.isLateArrival,
        calculatedFees,
        overrides: {
          fieldFeeOverride: override.fieldFeeOverride,
          videoFeeOverride: override.videoFeeOverride,
          lateFeeOverride: override.lateFeeOverride,
          notes: override.notes
        },
        finalFees: {
          fieldFee: finalFieldFee,
          videoFee: finalVideoFee,
          lateFee: finalLateFee,
          totalFee: finalTotalFee
        }
      }
    })
  }

  /**
   * Remove override and revert to calculated fees
   */
  async removeOverride(matchId: string, playerId: string): Promise<PlayerFeeBreakdown> {
    return await prisma.$transaction(async (tx) => {
      // Remove override record
      await tx.feeOverride.deleteMany({
        where: {
          matchId,
          playerId
        }
      })

      // Get participation
      const participation = await tx.matchParticipation.findUnique({
        where: {
          userId_matchId: {
            userId: playerId,
            matchId
          }
        },
        include: {
          user: {
            select: { id: true, name: true }
          }
        }
      })

      if (!participation) {
        throw new Error(`Player ${playerId} has no participation record for match ${matchId}`)
      }

      // Get match info and recalculate
      const match = await tx.match.findUnique({
        where: { id: matchId }
      })

      if (!match) {
        throw new Error(`Match ${matchId} not found`)
      }

      const attendanceData = participation.attendanceData as unknown as AttendanceData
      const totalPlayTime = await this.calculateTotalPlayTime(matchId)
      const feeCoefficient = calculateCoefficient(
        Number(match.fieldFeeTotal),
        Number(match.waterFeeTotal),
        totalPlayTime
      )

      const calculatedFees = calculatePlayerFees({
        attendanceData,
        isLateArrival: participation.isLateArrival,
        feeCoefficient,
        lateFeeRate: Number(match.lateFeeRate),
        videoFeeRate: Number(match.videoFeePerUnit)
      })

      // Update participation with calculated fees
      await tx.matchParticipation.update({
        where: {
          userId_matchId: {
            userId: playerId,
            matchId
          }
        },
        data: {
          fieldFeeCalculated: calculatedFees.fieldFee,
          videoFee: calculatedFees.videoFee,
          lateFee: calculatedFees.lateFee,
          totalFeeCalculated: calculatedFees.totalFee
        }
      })

      return {
        playerId,
        playerName: participation.user.name,
        totalTime: calculatedFees.normalPlayerParts,
        isLateArrival: participation.isLateArrival,
        calculatedFees,
        overrides: null,
        finalFees: {
          fieldFee: calculatedFees.fieldFee,
          videoFee: calculatedFees.videoFee,
          lateFee: calculatedFees.lateFee,
          totalFee: calculatedFees.totalFee
        }
      }
    })
  }

  /**
   * Get comprehensive fee breakdown for a match
   */
  async getFeeBreakdown(matchId: string): Promise<MatchFeeBreakdown> {
    // Get match info
    const match = await prisma.match.findUnique({
      where: { id: matchId }
    })

    if (!match) {
      throw new Error(`Match ${matchId} not found`)
    }

    // Get all participations with user info
    const participations = await prisma.matchParticipation.findMany({
      where: { matchId },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    })

    // Get fee overrides
    const feeOverrides = await prisma.feeOverride.findMany({
      where: { matchId }
    })

    const overrideMap = new Map(
      feeOverrides.map(o => [o.playerId, o])
    )

    // Calculate coefficient
    const totalPlayTime = participations.reduce((sum, p) => sum + Number(p.totalTime), 0)
    const feeCoefficient = calculateCoefficient(
      Number(match.fieldFeeTotal),
      Number(match.waterFeeTotal),
      totalPlayTime
    )

    // Build fee breakdown
    const players: PlayerFeeBreakdown[] = []
    let totalCalculatedFees = 0
    let totalFinalFees = 0

    for (const participation of participations) {
      const attendanceData = participation.attendanceData as unknown as AttendanceData
      
      const calculatedFees = calculatePlayerFees({
        attendanceData,
        isLateArrival: participation.isLateArrival,
        feeCoefficient,
        lateFeeRate: Number(match.lateFeeRate),
        videoFeeRate: Number(match.videoFeePerUnit)
      })

      const override = overrideMap.get(participation.userId)

      const finalFieldFee = Number(participation.fieldFeeCalculated)
      const finalVideoFee = Number(participation.videoFee)
      const finalLateFee = Number(participation.lateFee)
      const finalTotalFee = Number(participation.totalFeeCalculated)

      players.push({
        playerId: participation.userId,
        playerName: participation.user.name,
        totalTime: Number(participation.totalTime),
        isLateArrival: participation.isLateArrival,
        calculatedFees,
        overrides: override ? {
          fieldFeeOverride: override.fieldFeeOverride ? Number(override.fieldFeeOverride) : null,
          videoFeeOverride: override.videoFeeOverride ? Number(override.videoFeeOverride) : null,
          lateFeeOverride: override.lateFeeOverride ? Number(override.lateFeeOverride) : null,
          notes: override.notes || undefined
        } : null,
        finalFees: {
          fieldFee: finalFieldFee,
          videoFee: finalVideoFee,
          lateFee: finalLateFee,
          totalFee: finalTotalFee
        }
      })

      totalCalculatedFees += calculatedFees.totalFee
      totalFinalFees += finalTotalFee
    }

    return {
      matchId,
      totalParticipants: participations.length,
      totalCalculatedFees,
      totalFinalFees,
      feeCoefficient,
      players
    }
  }

  /**
   * Helper method to calculate total play time for a match
   */
  private async calculateTotalPlayTime(matchId: string): Promise<number> {
    const participations = await prisma.matchParticipation.findMany({
      where: { matchId },
      select: { totalTime: true }
    })

    return participations.reduce((sum, p) => sum + Number(p.totalTime), 0)
  }
}

// Export singleton instance
export const feeCalculationService = new FeeCalculationService()