'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Calculator, DollarSign } from 'lucide-react'
import { FeeSummaryCards } from './FeeSummaryCards'
import { FeeRatesCard } from './FeeRatesCard'
import { FeeTable } from './FeeTable'
import { FeeEditDialog } from './FeeEditDialog'
import { type MatchWithFeeRates, type PlayerFeeDisplay, type FeeSummaryData } from './types'
import { type Player, type AttendanceGrid } from '@/lib/validations/match'

const roundFee = (value: number) => Math.round(value)

interface FinancialTabProps {
  match: MatchWithFeeRates
  users: Player[]
  attendance: AttendanceGrid
}

export default function FinancialTab({ match, users, attendance }: FinancialTabProps) {
  const [playerFees, setPlayerFees] = useState<PlayerFeeDisplay[]>([])
  const [summaryData, setSummaryData] = useState<FeeSummaryData | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerFeeDisplay | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load fee data on mount and when attendance changes
  useEffect(() => {
    loadFeeData()
  }, [match.id, attendance])

  const loadFeeData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get comprehensive fee data with overrides
      const response = await fetch(`/api/admin/matches/${match.id}/fees`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to load fee data')
      }

      // Process the better structured fee data
      const processedFees = processNewFeeData(
        data.data.feeBreakdown || [],
        users,
        match
      )

      setPlayerFees(processedFees)
      setSummaryData(calculateSummaryData(processedFees, match))
    } catch (err) {
      console.error('Error loading fee data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load fee data')
    } finally {
      setIsLoading(false)
    }
  }

  const processNewFeeData = (
    feeBreakdown: any[],
    players: Player[],
    matchData: MatchWithFeeRates
  ): PlayerFeeDisplay[] => {
    return feeBreakdown.map(breakdown => {
      const player = players.find(p => p.id === breakdown.player.id)

      // Extract calculated fees (always from API)
      const calculatedFieldFee = roundFee(Number(breakdown.calculatedFees.fieldFee))
      const calculatedVideoFee = roundFee(Number(breakdown.calculatedFees.videoFee))
      const calculatedLateFee = roundFee(Number(breakdown.calculatedFees.lateFee))
      const calculatedFee = {
        fieldFee: calculatedFieldFee,
        videoFee: calculatedVideoFee,
        lateFee: calculatedLateFee,
        total: calculatedFieldFee + calculatedVideoFee + calculatedLateFee
      }

      // Check if override exists and build override fee
      let overrideFee: any = null
      let displayFee = calculatedFee.total
      let hasOverride = false

      if (breakdown.override) {
        const override = breakdown.override
        hasOverride = true

        // If fieldFeeOverride exists with notes (from Excel import), it represents total actual fee
        if (override.fieldFeeOverride != null && override.notes) {
          displayFee = roundFee(Number(override.fieldFeeOverride))
          overrideFee = {
            fieldFee: roundFee(Number(override.fieldFeeOverride)),
            videoFee: 0, // Total fee already includes everything
            lateFee: 0,
            total: roundFee(Number(override.fieldFeeOverride))
          }
        } else {
          // Manual override - build from individual components
          overrideFee = {
            fieldFee: roundFee(Number(override.fieldFeeOverride ?? calculatedFee.fieldFee)),
            videoFee: roundFee(Number(override.videoFeeOverride ?? calculatedFee.videoFee)),
            lateFee: roundFee(Number(override.lateFeeOverride ?? calculatedFee.lateFee)),
            total: 0
          }
          overrideFee.total = overrideFee.fieldFee + overrideFee.videoFee + overrideFee.lateFee
          displayFee = overrideFee.total
        }
      } else {
        // Use final fees if no explicit override (handles the display logic on backend)
        displayFee = roundFee(Number(breakdown.finalFees.totalFee))
      }

      return {
        playerId: breakdown.player.id,
        playerName: player?.name || breakdown.player.name || 'Unknown Player',
        totalTime: breakdown.totalTime,
        calculatedFee,
        overrideFee,
        displayFee,
        hasOverride,
        paymentNote: breakdown.override?.notes || '',
        isLate: breakdown.isLateArrival
      }
    })
  }

  const calculateSummaryData = (
    fees: PlayerFeeDisplay[],
    matchData: MatchWithFeeRates
  ): FeeSummaryData => {
    const totalParticipants = fees.length
    const totalFieldCosts = roundFee(Number(matchData.fieldFeeTotal || 0)) + roundFee(Number(matchData.waterFeeTotal || 0))
    const totalCollectedFees = fees.reduce((sum, fee) => sum + fee.displayFee, 0)
    const averageFeePerPlayer = totalParticipants > 0 ? roundFee(totalCollectedFees / totalParticipants) : 0
    const profitLoss = totalCollectedFees - totalFieldCosts

    return {
      totalParticipants,
      totalFieldCosts,
      totalCollectedFees,
      averageFeePerPlayer,
      profitLoss
    }
  }

  const handleEditPlayer = (player: PlayerFeeDisplay) => {
    setSelectedPlayer(player)
    setIsEditDialogOpen(true)
  }

  const handleSaveOverride = async (playerId: string, overrideData: any) => {
    try {
      // Optimistically update the UI
      setPlayerFees(prev => prev.map(p => {
        if (p.playerId === playerId) {
          const newOverride = {
            fieldFee: overrideData.fieldFee,
            videoFee: overrideData.videoFee,
            lateFee: overrideData.lateFee,
            total: overrideData.fieldFee + overrideData.videoFee + overrideData.lateFee
          }
          return {
            ...p,
            overrideFee: newOverride,
            displayFee: newOverride.total,
            hasOverride: true,
            paymentNote: overrideData.paymentNote
          }
        }
        return p
      }))

      // Recalculate summary
      const updatedFees = playerFees.map(p =>
        p.playerId === playerId
          ? {
            ...p,
            displayFee: overrideData.fieldFee + overrideData.videoFee + overrideData.lateFee,
            hasOverride: true
          }
          : p
      )
      setSummaryData(calculateSummaryData(updatedFees, match))

      // Reload data to ensure consistency
      await loadFeeData()
    } catch (error) {
      console.error('Error in optimistic update:', error)
      // Reload data on error
      await loadFeeData()
    }
  }

  const handleResetOverride = async (playerId: string) => {
    try {
      // Optimistically update the UI
      setPlayerFees(prev => prev.map(p => {
        if (p.playerId === playerId) {
          return {
            ...p,
            overrideFee: null,
            displayFee: p.calculatedFee.total,
            hasOverride: false,
            paymentNote: ''
          }
        }
        return p
      }))

      // Recalculate summary
      const updatedFees = playerFees.map(p =>
        p.playerId === playerId
          ? { ...p, displayFee: p.calculatedFee.total, hasOverride: false }
          : p
      )
      setSummaryData(calculateSummaryData(updatedFees, match))

      // Reload data to ensure consistency
      await loadFeeData()
    } catch (error) {
      console.error('Error in optimistic reset:', error)
      // Reload data on error
      await loadFeeData()
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              费用计算
            </CardTitle>
            <CardDescription>正在加载费用数据...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            费用计算
            {summaryData && summaryData.profitLoss !== 0 && (
              <Badge variant={summaryData.profitLoss > 0 ? "default" : "destructive"}>
                {summaryData.profitLoss > 0 ? '+' : ''}¥{summaryData.profitLoss}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            基于出勤数据自动计算各项费用，支持手动调整
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Fee Rates Display */}
      <FeeRatesCard match={match} />

      <Separator />

      {/* Summary Cards */}
      {summaryData && <FeeSummaryCards data={summaryData} match={match} />}

      <Separator />

      {/* Fee Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            球员费用明细
          </CardTitle>
          <CardDescription>
            点击行项目编辑个人费用
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FeeTable
            playerFees={playerFees}
            onEditPlayer={handleEditPlayer}
          />
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <FeeEditDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        player={selectedPlayer}
        matchId={match.id}
        onSave={handleSaveOverride}
        onReset={handleResetOverride}
      />
    </div>
  )
}
