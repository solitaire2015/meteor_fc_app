'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Users, 
  Target, 
  Award, 
  DollarSign,
  Save,
  Trophy,
  Timer
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import AttendanceGrid from '@/components/shared/AttendanceGrid'
import FinancialCalculator from '@/components/shared/FinancialCalculator'
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
        // TODO: Load existing attendance data when API supports it
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

  const handleAttendanceChange = (attendanceData: AttendanceData[]) => {
    setAttendance(attendanceData)
  }

  const handleFinancialUpdate = (financialInfo: FinancialData) => {
    setFinancialData(financialInfo)
  }

  // Auto-calculate match result based on scores
  const getMatchResult = (ourScore?: number, opponentScore?: number): 'WIN' | 'LOSE' | 'DRAW' | undefined => {
    if (ourScore === undefined || opponentScore === undefined) return undefined
    
    if (ourScore > opponentScore) return 'WIN'
    if (ourScore < opponentScore) return 'LOSE'
    return 'DRAW'
  }

  const calculatedResult = getMatchResult(match?.ourScore, match?.opponentScore)

  const saveAttendance = async () => {
    if (!match) return

    setSaving(true)
    try {
      // Use financial calculator data if available, otherwise fallback to basic calculation
      const totalParticipants = financialData?.totalParticipants || new Set(attendance.filter(a => a.value > 0).map(a => a.userId)).size
      const totalGoals = attendance.reduce((sum, a) => sum + a.goals, 0)
      const totalAssists = attendance.reduce((sum, a) => sum + a.assists, 0)
      
      // Use financial calculator's grand total if available
      const totalCalculatedFees = financialData?.grandTotal || Math.round(
        (match.fieldFeeTotal + match.waterFeeTotal) + 
        (totalParticipants * match.feeCoefficient)
      )

      // TODO: Replace with actual API call to save attendance
      // For now, just simulate saving
      const mockResponse = {
        success: true,
        data: {
          ...match,
          totalParticipants,
          totalGoals,
          totalAssists,
          totalCalculatedFees
        }
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (mockResponse.success) {
        setMatch(prev => prev ? {
          ...prev,
          totalParticipants,
          totalGoals,
          totalAssists,
          totalCalculatedFees
        } : null)
        toast.success('出勤数据保存成功！')
      } else {
        toast.error('保存出勤数据失败')
      }
    } catch (error) {
      console.error('Error saving attendance:', error)
      toast.error('保存出勤数据时发生错误')
    } finally {
      setSaving(false)
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
        <button 
          className={styles.saveButton}
          onClick={saveAttendance}
          disabled={saving}
        >
          <Save size={16} />
          {saving ? '保存中...' : '保存出勤'}
        </button>
      </header>

      <div className={styles.matchInfo}>
        <div className={styles.matchCard}>
          <div className={styles.score}>
            <div className={styles.team}>
              <span className={styles.teamName}>METEOR</span>
              <span className={styles.teamScore}>{match.ourScore ?? '--'}</span>
            </div>
            <div className={styles.vs}>VS</div>
            <div className={styles.team}>
              <span className={styles.teamScore}>{match.opponentScore ?? '--'}</span>
              <span className={styles.teamName}>{match.opponentTeam}</span>
            </div>
          </div>

          {calculatedResult && (
            <div className={`${styles.result} ${styles[calculatedResult.toLowerCase()]}`}>
              {calculatedResult === 'WIN' ? '胜利' : 
               calculatedResult === 'LOSE' ? '失败' : '平局'}
            </div>
          )}

          <div className={styles.matchDetails}>
            <div className={styles.detail}>
              <Calendar size={16} />
              <span>{new Date(match.matchDate).toLocaleDateString('zh-CN')}</span>
            </div>
            {match.matchTime && (
              <div className={styles.detail}>
                <Clock size={16} />
                <span>{new Date(match.matchTime).toLocaleTimeString('zh-CN', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}</span>
              </div>
            )}
            <div className={styles.detail}>
              <Trophy size={16} />
              <span>{match.status}</span>
            </div>
          </div>
        </div>

        <div className={styles.statsCard}>
          <h3>比赛统计</h3>
          <div className={styles.statsGrid}>
            <div className={styles.stat}>
              <Users size={20} />
              <span className={styles.statValue}>{financialData?.totalParticipants || match.totalParticipants}</span>
              <span className={styles.statLabel}>参与人数</span>
            </div>
            <div className={styles.stat}>
              <Target size={20} />
              <span className={styles.statValue}>{match.totalGoals}</span>
              <span className={styles.statLabel}>进球</span>
            </div>
            <div className={styles.stat}>
              <Award size={20} />
              <span className={styles.statValue}>{match.totalAssists}</span>
              <span className={styles.statLabel}>助攻</span>
            </div>
            <div className={styles.stat}>
              <DollarSign size={20} />
              <span className={styles.statValue}>{financialData?.grandTotal || match.totalCalculatedFees}</span>
              <span className={styles.statLabel}>总费用</span>
            </div>
          </div>
        </div>

        <div className={styles.feesCard}>
          <h3>费用明细</h3>
          <div className={styles.feeBreakdown}>
            <div className={styles.feeItem}>
              <span>场地费用:</span>
              <span>{match.fieldFeeTotal}元</span>
            </div>
            <div className={styles.feeItem}>
              <span>水费等杂费:</span>
              <span>{match.waterFeeTotal}元</span>
            </div>
            <div className={styles.feeItem}>
              <span>费用系数:</span>
              <span>{match.feeCoefficient}元/时段</span>
            </div>
            <div className={styles.feeItem}>
              <span>参与人数:</span>
              <span>{financialData?.totalParticipants || match.totalParticipants}人</span>
            </div>
            <div className={`${styles.feeItem} ${styles.total}`}>
              <span>计算总费用:</span>
              <span>{financialData?.grandTotal || match.totalCalculatedFees}元</span>
            </div>
            {financialData && (
              <>
                <div className={styles.feeItem}>
                  <span>平均费用:</span>
                  <span>{financialData.averageFeePerPlayer}元/人</span>
                </div>
                <div className={styles.feeItem}>
                  <span>视频费总计:</span>
                  <span>{financialData.totalVideoFees}元</span>
                </div>
                <div className={styles.feeItem}>
                  <span>迟到罚款:</span>
                  <span>{financialData.totalLateFees}元</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <AttendanceGrid
        matchId={matchId}
        users={users}
        onAttendanceChange={handleAttendanceChange}
        initialAttendance={attendance}
      />

      <FinancialCalculator
        match={match}
        attendance={attendance}
        users={users}
        onFinancialUpdate={handleFinancialUpdate}
      />

      {match.notes && (
        <div className={styles.notesCard}>
          <h3>比赛备注</h3>
          <p>{match.notes}</p>
        </div>
      )}
    </div>
  )
}