'use client'

import { useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Download, Save } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
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
  useClearErrors
} from '@/stores/useMatchStore'
import styles from './match-detail.module.css'

export default function MatchDetailPage() {
  const router = useRouter()
  const params = useParams()
  const matchId = params.id as string

  // Store state
  const matchInfo = useMatchInfo()
  const selectedPlayers = useSelectedPlayers()
  const attendanceData = useAttendanceData()
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

  // Get computed stats for display
  const stats = getAttendanceStats()

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
      <Toaster position="top-center" />
      
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