'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import TabContainer from '@/components/shared/TabContainer'
import MatchInfoTab from '@/components/admin/MatchInfoTab'
import AttendanceTab from '@/components/admin/AttendanceTab'
import StatisticsTab from '@/components/admin/StatisticsTab'
import FinancialTab from '@/components/admin/FinancialTab'
import { Match, User, AttendanceData, FinancialData } from '@/types'
import styles from './match-detail.module.css'

export default function MatchDetailPage() {
  const router = useRouter()
  const params = useParams()
  const matchId = params.id as string

  const [match, setMatch] = useState<Match | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [attendance, setAttendance] = useState<AttendanceData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [financialData, setFinancialData] = useState<FinancialData | null>(null)
  const [tabUnsavedChanges, setTabUnsavedChanges] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (matchId) {
      fetchMatchDetails()
      fetchUsers()
    }
  }, [matchId])

  const fetchMatchDetails = async () => {
    try {
      const response = await fetch(`/api/games/${matchId}`)
      const data = await response.json()
      
      if (data.success) {
        setMatch(data.data)
        
        // Load existing attendance data if available
        await loadExistingAttendance()
      } else {
        toast.error('获取比赛详情失败')
        router.push('/admin/matches')
      }
    } catch (error) {
      console.error('Error fetching match details:', error)
      toast.error('获取比赛详情时发生错误')
      router.push('/admin/matches')
    }
  }

  const loadExistingAttendance = async () => {
    try {
      const response = await fetch(`/api/admin/matches/${matchId}/save-details`)
      const data = await response.json()
      
      if (data.success && data.data.attendance.length > 0) {
        // The API now returns AttendanceData[] directly in the correct format
        setAttendance(data.data.attendance)
        toast.success('已加载现有出勤数据')
      }
    } catch (error) {
      // Ignore errors - this just means no existing data
      console.log('No existing attendance data found')
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/players')
      const data = await response.json()
      
      if (data.success) {
        setUsers(data.data)
      } else {
        console.error('Failed to fetch users:', data.error)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAttendanceChange = useCallback((attendanceData: AttendanceData[]) => {
    setAttendance(attendanceData)
  }, [])

  const handleFinancialUpdate = useCallback((financialInfo: FinancialData) => {
    setFinancialData(financialInfo)
  }, [])

  const handleMatchUpdate = useCallback((updatedMatch: Match) => {
    setMatch(updatedMatch)
  }, [])

  const handleAttendanceUpdate = useCallback((updatedAttendance: AttendanceData[]) => {
    setAttendance(updatedAttendance)
    // Reload existing attendance to get the latest data
    loadExistingAttendance()
  }, [])

  const handleTabUnsavedChanges = useCallback((tabId: string, hasChanges: boolean) => {
    setTabUnsavedChanges(prev => {
      // Only update if the value actually changed to prevent infinite loops
      if (prev[tabId] === hasChanges) {
        return prev
      }
      return {
        ...prev,
        [tabId]: hasChanges
      }
    })
  }, [])

  const handleExportExcel = async () => {
    if (!match) return

    try {
      toast.loading('生成Excel文件中...', { id: 'excel-export' })
      
      const response = await fetch(`/api/admin/excel/export/${match.id}`)
      
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
  }


  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>加载中...</div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>比赛不存在</div>
      </div>
    )
  }

  const tabs = [
    {
      id: 'match-info',
      label: '比赛信息',
      hasUnsavedChanges: tabUnsavedChanges['match-info'],
      content: (
        <MatchInfoTab
          match={match}
          onMatchUpdate={handleMatchUpdate}
          onUnsavedChanges={(hasChanges) => handleTabUnsavedChanges('match-info', hasChanges)}
        />
      )
    },
    {
      id: 'attendance',
      label: '出勤管理',
      hasUnsavedChanges: tabUnsavedChanges['attendance'],
      content: (
        <AttendanceTab
          match={match}
          users={users}
          initialAttendance={attendance}
          onAttendanceUpdate={handleAttendanceUpdate}
          onUnsavedChanges={(hasChanges) => handleTabUnsavedChanges('attendance', hasChanges)}
        />
      )
    },
    {
      id: 'statistics',
      label: '比赛统计',
      content: (
        <StatisticsTab
          match={match}
          users={users}
          attendance={attendance}
        />
      )
    },
    {
      id: 'financial',
      label: '费用计算',
      content: (
        <FinancialTab
          match={match}
          users={users}
          attendance={attendance}
          onFinancialUpdate={handleFinancialUpdate}
        />
      )
    }
  ]

  return (
    <div className={styles.container}>
      <Toaster position="top-center" />
      
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button 
            className={styles.backButton}
            onClick={() => router.push('/admin/matches')}
          >
            <ArrowLeft size={16} />
            返回比赛列表
          </button>
          <div className={styles.matchTitle}>
            <h1>METEOR vs {match.opponentTeam}</h1>
            <p>{new Date(match.matchDate).toLocaleDateString('zh-CN')}</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button 
            className={styles.exportButton}
            onClick={handleExportExcel}
            title="导出Excel文件"
          >
            <Download size={16} />
            导出Excel
          </button>
          {Object.values(tabUnsavedChanges).some(Boolean) && (
            <div className={styles.unsavedIndicator}>
              有未保存的更改
            </div>
          )}
        </div>
      </header>

      <div className={styles.content}>
        <TabContainer
          tabs={tabs}
          defaultActiveTab="match-info"
          className={styles.tabContainer}
        />
      </div>
    </div>
  )
}