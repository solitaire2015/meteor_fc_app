'use client'

import { useEffect, useCallback, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Download, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import TabContainer from '@/components/shared/TabContainer'
import MatchInfoTab from '@/components/admin/MatchInfoTab'
import AttendanceTab from '@/components/admin/AttendanceTab'
import StatisticsTab from '@/components/admin/StatisticsTab'
import FinancialTab from '@/components/admin/FinancialTab'
import { 
  useMatchInfo, 
  useSelectedPlayers, 
  useAvailablePlayers,
  useAttendanceData, 
  useIsDirty, 
  useIsLoading, 
  useErrors,
  useLoadMatch,
  useLoadPlayers,
  useLoadAttendance,
  useSaveAll,
  useHasUnsavedChanges,
  useGetAttendanceStats,
  useClearErrors,
  useUpdateMatchInfo,
  useSetSelectedPlayers,
  useUpdateAttendance,
  useSetFeeOverride,
  useAddEvent
} from '@/stores/useMatchStore'
import AssistantWidget from '@/components/ai/AssistantWidget'
import { type PatchEnvelope } from '@/lib/ai/schema'
import styles from './match-detail.module.css'

export default function MatchDetailPage() {
  const router = useRouter()
  const params = useParams()
  const matchId = params.id as string

  // Store state
  const matchInfo = useMatchInfo()
  const selectedPlayers = useSelectedPlayers()
  const availablePlayers = useAvailablePlayers()
  const attendanceData = useAttendanceData()
  const [feeContext, setFeeContext] = useState<{
    match?: {
      id: string
      opponentTeam: string
      fieldFeeTotal: number
      waterFeeTotal: number
    }
    feeBreakdown?: Array<{
      player: {
        id: string
        name: string
        jerseyNumber?: number | null
        position?: string | null
      }
      totalTime: number
      isLateArrival: boolean
      calculatedFees: {
        fieldFee: number
        videoFee: number
        lateFee: number
        totalFee: number
      }
      finalFees: {
        fieldFee: number
        videoFee: number
        lateFee: number
        totalFee: number
      }
      override?: {
        fieldFeeOverride?: number | null
        videoFeeOverride?: number | null
        lateFeeOverride?: number | null
        notes?: string | null
      } | null
    }>
    summary?: {
      totalParticipants: number
      totalCalculatedFees: number
      totalFinalFees: number
      feeDifference: number
      overrideCount: number
      overridePercentage: number
      feeCoefficient: number
    }
  } | null>(null)
  const isDirty = useIsDirty()
  const isLoading = useIsLoading()
  const errors = useErrors()

  // Store actions
  const loadMatch = useLoadMatch()
  const loadPlayers = useLoadPlayers()
  const loadAttendance = useLoadAttendance()
  const saveAll = useSaveAll()
  const hasUnsavedChanges = useHasUnsavedChanges()
  const getAttendanceStats = useGetAttendanceStats()
  const clearErrors = useClearErrors()
  const updateMatchInfo = useUpdateMatchInfo()
  const setSelectedPlayers = useSetSelectedPlayers()
  const updateAttendance = useUpdateAttendance()
  const setFeeOverride = useSetFeeOverride()
  const addEvent = useAddEvent()

  // Load data on mount
  useEffect(() => {
    if (matchId) {
      const loadData = async () => {
        try {
          await Promise.all([
            loadMatch(matchId),
            loadPlayers(matchId),
            loadAttendance(matchId)
          ])
        } catch (error) {
          console.error('Error loading match data:', error)
          router.push('/admin/matches')
        }
      }

      loadData()
    }
  }, [matchId, loadMatch, loadPlayers, loadAttendance, router])

  useEffect(() => {
    if (!matchId) return

    const controller = new AbortController()
    setFeeContext(null)

    const loadFees = async () => {
      try {
        const response = await fetch(`/api/admin/matches/${matchId}/fees`, {
          signal: controller.signal
        })
        const data = await response.json()
        if (data.success) {
          setFeeContext({
            match: data.data.match,
            feeBreakdown: data.data.feeBreakdown,
            summary: data.data.summary
          })
        }
      } catch (error) {
        if ((error instanceof DOMException && error.name === 'AbortError') || (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'AbortError')) {
          return
        }
        console.error('Error loading fee context:', error)
      }
    }

    loadFees()

    return () => {
      try {
        controller.abort()
      } catch {
        // Ignore abort errors to avoid noisy console logs during unmount
      }
    }
  }, [matchId])

  // Handle tab change with potential navigation guard
  const handleTabChange = useCallback((newTabId: string, previousTabId: string) => {
    console.log(`Switching from ${previousTabId} to ${newTabId}`)
  }, [])

  // Handle save all changes
  const handleSaveAll = useCallback(async () => {
    try {
      await saveAll()
    } catch (error) {
      console.error('Error saving changes:', error)
    }
  }, [saveAll])

  const handleAutoSaveFromAi = useCallback(async (patches: PatchEnvelope[]) => {
    const hasMatchPatch = patches.some(patch => patch.target === 'match_detail')
    if (!hasMatchPatch) return
    await handleSaveAll()
  }, [handleSaveAll])

  // Handle Excel export
  const handleExportExcel = useCallback(async () => {
    if (!matchInfo) return

    try {
      toast.loading('生成Excel文件中...', { id: 'excel-export' })
      
      const response = await fetch(`/api/admin/excel/export/${matchInfo.id}`)
      
      if (!response.ok) {
        throw new Error('导出失败')
      }
      
      // Get filename from Content-Disposition header or create default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'match_export.xlsx'
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/)
        if (match) {
          filename = decodeURIComponent(match[1])
        }
      }
      
      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Excel文件导出成功', { id: 'excel-export' })
    } catch (error) {
      console.error('Export error:', error)
      toast.error('导出Excel文件失败', { id: 'excel-export' })
    }
  }, [matchInfo])

  // Get computed stats for display
  const stats = getAttendanceStats()

  const compactAttendance = useMemo(() => {
    return attendanceData
      .filter(item =>
        item.value > 0 ||
        item.isGoalkeeper ||
        item.isLateArrival ||
        item.goals > 0 ||
        item.assists > 0
      )
      .map(item => ({
        userId: item.userId,
        section: item.section,
        part: item.part,
        value: item.value,
        isGoalkeeper: item.isGoalkeeper,
        isLateArrival: item.isLateArrival,
        goals: item.goals,
        assists: item.assists
      }))
  }, [attendanceData])

  const applyMatchDetailPatch = useCallback((patch: PatchEnvelope) => {
    if (patch.target !== 'match_detail' || !matchInfo) return

    patch.changes.forEach(change => {
      if (change.type === 'match_info') {
        const updates = { ...change.data }

        if (change.data.matchDate) {
          const dateStr = change.data.matchDate
          updates.matchDate = new Date(`${dateStr}T00:00:00.000Z`).toISOString()

          if (change.data.matchTime) {
            updates.matchTime = new Date(`${dateStr}T${change.data.matchTime}:00.000Z`).toISOString()
          }
        } else if (change.data.matchTime) {
          const dateStr = matchInfo.matchDate.split('T')[0]
          updates.matchTime = new Date(`${dateStr}T${change.data.matchTime}:00.000Z`).toISOString()
        }

        updateMatchInfo(updates)
        return
      }

      if (change.type === 'player_selection') {
        const addIds = new Set(change.data.addPlayerIds || [])
        const removeIds = new Set(change.data.removePlayerIds || [])
        const byId = new Map(availablePlayers.map(player => [player.id, player]))

        const remaining = selectedPlayers.filter(player => !removeIds.has(player.id))
        const remainingIds = new Set(remaining.map(player => player.id))
        const additions = Array.from(addIds)
          .map(id => byId.get(id))
          .filter(player => player && !remainingIds.has(player.id))

        const nextSelected = [...remaining, ...additions].filter(Boolean)

        setSelectedPlayers(nextSelected as typeof selectedPlayers)
        return
      }

      if (change.type === 'attendance') {
        let nextAttendance = attendanceData.map(item => ({ ...item }))

        change.data.updates.forEach(update => {
          if (update.isLateArrival !== undefined) {
            nextAttendance = nextAttendance.map(item =>
              item.userId === update.playerId
                ? { ...item, isLateArrival: update.isLateArrival }
                : item
            )
          }

          if (update.section !== undefined && update.part !== undefined) {
            const section = update.section
            const part = update.part

            if (update.isGoalkeeper) {
              nextAttendance = nextAttendance.map(item =>
                item.section === section &&
                item.part === part &&
                item.userId !== update.playerId
                  ? { ...item, isGoalkeeper: false }
                  : item
              )
            }

            const index = nextAttendance.findIndex(
              item =>
                item.userId === update.playerId &&
                item.section === section &&
                item.part === part
            )

            if (index >= 0) {
              const current = nextAttendance[index]
              nextAttendance[index] = {
                ...current,
                value: update.value ?? current.value,
                isGoalkeeper: update.isGoalkeeper ?? current.isGoalkeeper,
                isLateArrival: update.isLateArrival ?? current.isLateArrival
              }
            } else {
              nextAttendance.push({
                userId: update.playerId,
                section,
                part,
                value: update.value ?? 0,
                isGoalkeeper: update.isGoalkeeper ?? false,
                isLateArrival: update.isLateArrival ?? false,
                goals: 0,
                assists: 0
              })
            }
          }
        })

        updateAttendance(nextAttendance)
        return
      }

      if (change.type === 'events') {
        change.data.updates.forEach(update => {
          if (update.eventType) {
            addEvent({
              playerId: update.playerId,
              eventType: update.eventType,
              minute: update.minute,
            })
          }
        })
        return
      }

      if (change.type === 'fees') {
        change.data.overrides.forEach(override => {
          setFeeOverride(override.playerId, {
            fieldFee: override.fieldFee,
            videoFee: override.videoFee,
            lateFee: override.lateFee,
            notes: override.paymentNote
          })
        })
      }
    })
  }, [
    attendanceData,
    availablePlayers,
    matchInfo,
    selectedPlayers,
    setFeeOverride,
    setSelectedPlayers,
    updateAttendance,
    updateMatchInfo
  ])

  // Loading state
  if (isLoading.match) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>加载中...</div>
      </div>
    )
  }

  // Error state
  if (errors.match) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          {errors.match}
          <Button 
            onClick={() => router.push('/admin/matches')}
          >
            返回比赛列表
          </Button>
        </div>
      </div>
    )
  }

  // No match state
  if (!matchInfo) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>比赛不存在</div>
      </div>
    )
  }

  // Define tabs with store integration
  const tabs = [
    {
      id: 'info',
      label: '比赛信息',
      content: (
        <MatchInfoTab
          match={matchInfo}
        />
      )
    },
    {
      id: 'attendance',
      label: '出勤管理',
      badge: stats.totalParticipants > 0 ? stats.totalParticipants : undefined,
      content: (
        <AttendanceTab
          match={matchInfo}
          users={selectedPlayers}
          initialAttendance={attendanceData}
        />
      )
    },
    {
      id: 'statistics',
      label: '比赛统计',
      badge: stats.totalGoals + stats.totalAssists > 0 ? stats.totalGoals + stats.totalAssists : undefined,
      content: (
        <StatisticsTab
          match={matchInfo}
          users={selectedPlayers}
          attendance={attendanceData}
        />
      )
    },
    {
      id: 'fees',
      label: '费用计算',
      content: (
        <FinancialTab
          match={matchInfo}
          users={selectedPlayers}
          attendance={attendanceData}
        />
      )
    }
  ]

  const hasChanges = hasUnsavedChanges()

  return (
    <div className={styles.container}>
      <AssistantWidget
        context={{
          page: 'admin/matches/[id]',
          matchId,
          locale: 'zh-CN',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          currentMatch: {
            info: {
              id: matchInfo.id,
              matchDate: matchInfo.matchDate,
              matchTime: matchInfo.matchTime ?? null,
              opponentTeam: matchInfo.opponentTeam,
              ourScore: matchInfo.ourScore ?? null,
              opponentScore: matchInfo.opponentScore ?? null,
              fieldFeeTotal: Number(matchInfo.fieldFeeTotal),
              waterFeeTotal: Number(matchInfo.waterFeeTotal),
              notes: matchInfo.notes ?? null,
              status: matchInfo.status ?? undefined,
            },
            selectedPlayers: selectedPlayers.map(player => ({
              id: player.id,
              name: player.name,
              jerseyNumber: player.jerseyNumber,
              position: player.position
            })),
            attendance: attendanceData,
            fees: feeContext ?? undefined,
          },
          availablePlayers: availablePlayers.map(player => ({
            id: player.id,
            name: player.name,
            jerseyNumber: player.jerseyNumber,
            position: player.position
          })),
          formState: {
            matchInfo,
            selectedPlayerIds: selectedPlayers.map(player => player.id),
            attendance: compactAttendance
          }
        }}
        onApplyPatch={applyMatchDetailPatch}
        onAfterApplyAll={handleAutoSaveFromAi}
      />
      
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Button 
            variant="ghost"
            onClick={() => router.push('/admin/matches')}
            disabled={isLoading.saving}
            className="gap-2"
          >
            <ArrowLeft size={16} />
            返回比赛列表
          </Button>
          <div className={styles.matchTitle}>
            <h1>METEOR vs {matchInfo.opponentTeam}</h1>
            <p>{new Date(matchInfo.matchDate).toLocaleDateString('zh-CN')}</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          {/* Save All Button */}
          {hasChanges && (
            <Button 
              onClick={handleSaveAll}
              disabled={isLoading.saving}
              title="保存所有更改 (Ctrl+S)"
              className="gap-2"
            >
              <Save size={16} />
              {isLoading.saving ? '保存中...' : '保存所有'}
            </Button>
          )}
          
          {/* Export Button */}
          <Button 
            variant="outline"
            onClick={handleExportExcel}
            disabled={isLoading.saving}
            title="导出Excel文件"
            className="gap-2"
          >
            <Download size={16} />
            导出Excel
          </Button>
          
          {/* Unsaved Changes Indicator */}
          {hasChanges && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              有未保存的更改
            </Badge>
          )}
        </div>
      </header>

      <div className={styles.content}>
        <TabContainer
          tabs={tabs}
          defaultActiveTab="info"
          className={styles.tabContainer}
          onTabChange={handleTabChange}
          navigationGuard={true}
        />
      </div>

      {/* Error Display */}
      {Object.keys(errors).length > 0 && (
        <div className={styles.errorBanner}>
          <div className={styles.errorContent}>
            <h4>发生错误:</h4>
            <ul>
              {Object.entries(errors).map(([key, message]) => (
                <li key={key}>{key}: {message}</li>
              ))}
            </ul>
          </div>
          <Button 
            variant="ghost"
            size="sm"
            onClick={clearErrors}
            className="h-6 w-6 p-0 text-red-600 hover:bg-red-100"
          >
            ×
          </Button>
        </div>
      )}
    </div>
  )
}
