/**
 * Fee Override Service
 * 
 * Manages manual fee adjustments and provides audit trail for overrides:
 * - Create and manage fee overrides
 * - Audit trail tracking
 * - Bulk override operations
 * - Override validation and notes management
 */

import { prisma } from '@/lib/prisma'
import { feeCalculationService, type FeeOverride, type PlayerFeeBreakdown } from './feeCalculationService'

const roundOverrideValue = (value: number | null) => {
  if (value === null) return null
  return Math.ceil(Number(value))
}

export interface FeeOverrideInput {
  fieldFeeOverride?: number | null
  videoFeeOverride?: number | null
  lateFeeOverride?: number | null
  notes?: string
}

export interface BulkFeeOverrideInput {
  overrides: {
    playerId: string
    override: FeeOverrideInput
  }[]
}

export interface FeeOverrideHistory {
  id: string
  playerId: string
  playerName: string
  fieldFeeOverride: number | null
  videoFeeOverride: number | null
  lateFeeOverride: number | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface OverrideValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export class FeeOverrideService {
  /**
   * Apply single fee override
   */
  async applyOverride(
    matchId: string,
    playerId: string,
    override: FeeOverrideInput
  ): Promise<PlayerFeeBreakdown> {
    // Validate override input
    const validation = this.validateOverride(override)
    if (!validation.isValid) {
      throw new Error(`Override validation failed: ${validation.errors.join(', ')}`)
    }

    return await feeCalculationService.applyManualOverride(matchId, playerId, override)
  }

  /**
   * Apply bulk fee overrides
   */
  async applyBulkOverrides(
    matchId: string,
    bulkInput: BulkFeeOverrideInput
  ): Promise<{
    success: boolean
    results: PlayerFeeBreakdown[]
    errors: { playerId: string; error: string }[]
  }> {
    const results: PlayerFeeBreakdown[] = []
    const errors: { playerId: string; error: string }[] = []

    // Process each override individually to handle partial failures
    for (const { playerId, override } of bulkInput.overrides) {
      try {
        const validation = this.validateOverride(override)
        if (!validation.isValid) {
          errors.push({
            playerId,
            error: `Validation failed: ${validation.errors.join(', ')}`
          })
          continue
        }

        const result = await feeCalculationService.applyManualOverride(matchId, playerId, override)
        results.push(result)
      } catch (error) {
        errors.push({
          playerId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors
    }
  }

  /**
   * Remove fee override and revert to calculated fees
   */
  async removeOverride(matchId: string, playerId: string): Promise<PlayerFeeBreakdown> {
    return await feeCalculationService.removeOverride(matchId, playerId)
  }

  /**
   * Remove multiple fee overrides
   */
  async removeBulkOverrides(
    matchId: string,
    playerIds: string[]
  ): Promise<{
    success: boolean
    results: PlayerFeeBreakdown[]
    errors: { playerId: string; error: string }[]
  }> {
    const results: PlayerFeeBreakdown[] = []
    const errors: { playerId: string; error: string }[] = []

    for (const playerId of playerIds) {
      try {
        const result = await feeCalculationService.removeOverride(matchId, playerId)
        results.push(result)
      } catch (error) {
        errors.push({
          playerId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors
    }
  }

  /**
   * Get override history for a match
   */
  async getOverrideHistory(matchId: string): Promise<FeeOverrideHistory[]> {
    const overrides = await prisma.feeOverride.findMany({
      where: { matchId },
      include: {
        player: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return overrides.map(override => ({
      id: override.id,
      playerId: override.playerId,
      playerName: override.player.name,
      fieldFeeOverride: roundOverrideValue(override.fieldFeeOverride),
      videoFeeOverride: roundOverrideValue(override.videoFeeOverride),
      lateFeeOverride: roundOverrideValue(override.lateFeeOverride),
      notes: override.notes,
      createdAt: override.createdAt,
      updatedAt: override.updatedAt
    }))
  }

  /**
   * Get override history for a specific player across all matches
   */
  async getPlayerOverrideHistory(playerId: string): Promise<FeeOverrideHistory[]> {
    const overrides = await prisma.feeOverride.findMany({
      where: { playerId },
      include: {
        player: {
          select: {
            id: true,
            name: true
          }
        },
        match: {
          select: {
            id: true,
            matchDate: true,
            opponentTeam: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return overrides.map(override => ({
      id: override.id,
      playerId: override.playerId,
      playerName: override.player.name,
      fieldFeeOverride: roundOverrideValue(override.fieldFeeOverride),
      videoFeeOverride: roundOverrideValue(override.videoFeeOverride),
      lateFeeOverride: roundOverrideValue(override.lateFeeOverride),
      notes: override.notes,
      createdAt: override.createdAt,
      updatedAt: override.updatedAt
    }))
  }

  /**
   * Copy fee overrides from another match
   */
  async copyOverridesFromMatch(
    sourceMatchId: string,
    targetMatchId: string,
    playerMapping?: Map<string, string> // sourcePlayerId -> targetPlayerId
  ): Promise<{
    success: boolean
    copiedCount: number
    skippedCount: number
    errors: string[]
  }> {
    const errors: string[] = []

    try {
      // Get source overrides
      const sourceOverrides = await prisma.feeOverride.findMany({
        where: { matchId: sourceMatchId },
        include: {
          player: {
            select: { id: true, name: true }
          }
        }
      })

      if (sourceOverrides.length === 0) {
        return {
          success: true,
          copiedCount: 0,
          skippedCount: 0,
          errors: ['No overrides found in source match']
        }
      }

      // Verify target match exists
      const targetMatch = await prisma.match.findUnique({
        where: { id: targetMatchId }
      })

      if (!targetMatch) {
        throw new Error(`Target match ${targetMatchId} not found`)
      }

      let copiedCount = 0
      let skippedCount = 0

      for (const sourceOverride of sourceOverrides) {
        try {
          // Determine target player ID
          const targetPlayerId = playerMapping?.get(sourceOverride.playerId) || sourceOverride.playerId

          // Check if target player exists and has participation in target match
          const targetParticipation = await prisma.matchParticipation.findUnique({
            where: {
              userId_matchId: {
                userId: targetPlayerId,
                matchId: targetMatchId
              }
            }
          })

          if (!targetParticipation) {
            skippedCount++
            errors.push(`Player ${sourceOverride.player.name} not found in target match`)
            continue
          }

          // Apply override to target match
          await this.applyOverride(targetMatchId, targetPlayerId, {
            fieldFeeOverride: sourceOverride.fieldFeeOverride ? Number(sourceOverride.fieldFeeOverride) : null,
            videoFeeOverride: sourceOverride.videoFeeOverride ? Number(sourceOverride.videoFeeOverride) : null,
            lateFeeOverride: sourceOverride.lateFeeOverride ? Number(sourceOverride.lateFeeOverride) : null,
            notes: `Copied from match ${sourceMatchId}: ${sourceOverride.notes || ''}`
          })

          copiedCount++
        } catch (error) {
          skippedCount++
          errors.push(`Failed to copy override for ${sourceOverride.player.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return {
        success: errors.length === 0,
        copiedCount,
        skippedCount,
        errors
      }
    } catch (error) {
      return {
        success: false,
        copiedCount: 0,
        skippedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Get override statistics for a match
   */
  async getOverrideStatistics(matchId: string): Promise<{
    totalPlayers: number
    playersWithOverrides: number
    overridePercentage: number
    totalCalculatedFees: number
    totalFinalFees: number
    feeDifference: number
    overrideTypes: {
      fieldFeeOverrides: number
      videoFeeOverrides: number
      lateFeeOverrides: number
    }
  }> {
    const feeBreakdown = await feeCalculationService.getFeeBreakdown(matchId)
    
    const playersWithOverrides = feeBreakdown.players.filter(p => p.overrides !== null).length
    const overridePercentage = feeBreakdown.totalParticipants > 0 ? 
      (playersWithOverrides / feeBreakdown.totalParticipants) * 100 : 0

    const feeDifference = feeBreakdown.totalFinalFees - feeBreakdown.totalCalculatedFees

    // Count override types
    const overrideTypes = feeBreakdown.players.reduce((acc, player) => {
      if (player.overrides) {
        if (player.overrides.fieldFeeOverride !== null) acc.fieldFeeOverrides++
        if (player.overrides.videoFeeOverride !== null) acc.videoFeeOverrides++
        if (player.overrides.lateFeeOverride !== null) acc.lateFeeOverrides++
      }
      return acc
    }, {
      fieldFeeOverrides: 0,
      videoFeeOverrides: 0,
      lateFeeOverrides: 0
    })

    return {
      totalPlayers: feeBreakdown.totalParticipants,
      playersWithOverrides,
      overridePercentage,
      totalCalculatedFees: feeBreakdown.totalCalculatedFees,
      totalFinalFees: feeBreakdown.totalFinalFees,
      feeDifference,
      overrideTypes
    }
  }

  /**
   * Validate fee override input
   */
  private validateOverride(override: FeeOverrideInput): OverrideValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate field fee override
    if (override.fieldFeeOverride !== undefined && override.fieldFeeOverride !== null) {
      if (override.fieldFeeOverride < 0) {
        errors.push('Field fee override cannot be negative')
      }
      if (override.fieldFeeOverride > 1000) {
        warnings.push('Field fee override is unusually high (>1000)')
      }
    }

    // Validate video fee override
    if (override.videoFeeOverride !== undefined && override.videoFeeOverride !== null) {
      if (override.videoFeeOverride < 0) {
        errors.push('Video fee override cannot be negative')
      }
      if (override.videoFeeOverride > 100) {
        warnings.push('Video fee override is unusually high (>100)')
      }
    }

    // Validate late fee override
    if (override.lateFeeOverride !== undefined && override.lateFeeOverride !== null) {
      if (override.lateFeeOverride < 0) {
        errors.push('Late fee override cannot be negative')
      }
      if (override.lateFeeOverride > 50) {
        warnings.push('Late fee override is unusually high (>50)')
      }
    }

    // Validate notes
    if (override.notes && override.notes.length > 500) {
      errors.push('Notes cannot exceed 500 characters')
    }

    // Check if large overrides have justification notes
    const hasLargeOverride = (
      (override.fieldFeeOverride && override.fieldFeeOverride > 200) ||
      (override.videoFeeOverride && override.videoFeeOverride > 20) ||
      (override.lateFeeOverride && override.lateFeeOverride > 20)
    )

    if (hasLargeOverride && (!override.notes || override.notes.trim().length < 10)) {
      warnings.push('Large overrides should include justification notes')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
}

// Export singleton instance
export const feeOverrideService = new FeeOverrideService()
