'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Calendar, 
  Clock, 
  Users, 
  Target, 
  Award, 
  DollarSign, 
  Plus, 
  ArrowLeft,
  Trophy,
  Medal,
  Minus
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import styles from './matches.module.css'

interface Match {
  id: string
  matchDate: string
  matchTime?: string
  opponentTeam: string
  ourScore?: number
  opponentScore?: number
  matchResult?: 'WIN' | 'LOSE' | 'DRAW'
  fieldFeeTotal: number
  waterFeeTotal: number
  feeCoefficient: number
  notes?: string
  totalParticipants: number
  totalGoals: number
  totalAssists: number
  totalCalculatedFees: number
  status: string
  createdAt: string
}

interface User {
  id: string
  name: string
  jerseyNumber?: number
  position?: string
}

export default function MatchesAdminPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    matchDate: '',
    matchTime: '',
    opponentTeam: '',
    ourScore: '',
    opponentScore: '',
    fieldFeeTotal: '1100',
    waterFeeTotal: '50',
    feeCoefficient: '12.78',
    notes: ''
  })
  
  const router = useRouter()

  useEffect(() => {
    fetchMatches()
    fetchUsers()
  }, [])

  const fetchMatches = async () => {
    try {
      const response = await fetch('/api/games')
      const data = await response.json()
      if (data.success) {
        setMatches(data.data)
      } else {
        console.error('Failed to fetch matches:', data.error)
      }
    } catch (error) {
      console.error('Error fetching matches:', error)
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

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Get admin user ID (assuming first admin user for now)
    const adminUser = users.find(u => u.name === '管理员') || users[0]
    if (!adminUser) {
      alert('需要管理员用户才能创建比赛')
      return
    }

    const matchData = {
      matchDate: new Date(formData.matchDate).toISOString(),
      matchTime: formData.matchTime ? new Date(`${formData.matchDate}T${formData.matchTime}`).toISOString() : undefined,
      opponentTeam: formData.opponentTeam,
      ourScore: formData.ourScore ? parseInt(formData.ourScore) : undefined,
      opponentScore: formData.opponentScore ? parseInt(formData.opponentScore) : undefined,
      fieldFeeTotal: parseFloat(formData.fieldFeeTotal),
      waterFeeTotal: parseFloat(formData.waterFeeTotal),
      feeCoefficient: parseFloat(formData.feeCoefficient),
      notes: formData.notes || undefined,
      createdBy: adminUser.id
    }

    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(matchData)
      })

      const data = await response.json()
      
      if (data.success) {
        await fetchMatches() // Refresh the list
        setFormData({
          matchDate: '',
          matchTime: '',
          opponentTeam: '',
          ourScore: '',
          opponentScore: '',
          fieldFeeTotal: '1100',
          waterFeeTotal: '50',
          feeCoefficient: '12.78',
          notes: ''
        })
        setShowCreateForm(false)
        toast.success('比赛创建成功！')
      } else {
        toast.error('创建比赛失败: ' + data.error.message)
      }
    } catch (error) {
      console.error('Error creating match:', error)
      toast.error('创建比赛时发生错误')
    }
  }

  const handleMatchClick = (matchId: string) => {
    router.push(`/admin/matches/${matchId}`)
  }

  // Auto-calculate match result based on scores
  const getMatchResult = (ourScore?: number, opponentScore?: number): 'WIN' | 'LOSE' | 'DRAW' | undefined => {
    if (ourScore === undefined || opponentScore === undefined) return undefined
    
    if (ourScore > opponentScore) return 'WIN'
    if (ourScore < opponentScore) return 'LOSE'
    return 'DRAW'
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>加载中...</div>
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
            onClick={() => router.push('/admin')}
          >
            <ArrowLeft size={16} />
            返回管理后台
          </button>
          <h1>比赛管理</h1>
        </div>
        <button 
          className={styles.createButton}
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? <Minus size={16} /> : <Plus size={16} />}
          {showCreateForm ? '取消' : '创建新比赛'}
        </button>
      </header>

      {showCreateForm && (
        <div className={styles.createForm}>
          <h2>创建新比赛</h2>
          <form onSubmit={handleCreateMatch}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>比赛日期 *</label>
                <input
                  type="date"
                  value={formData.matchDate}
                  onChange={(e) => setFormData({...formData, matchDate: e.target.value})}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>比赛时间</label>
                <input
                  type="time"
                  value={formData.matchTime}
                  onChange={(e) => setFormData({...formData, matchTime: e.target.value})}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>对手球队 *</label>
              <input
                type="text"
                value={formData.opponentTeam}
                onChange={(e) => setFormData({...formData, opponentTeam: e.target.value})}
                placeholder="输入对手球队名称"
                required
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>我方得分</label>
                <input
                  type="number"
                  value={formData.ourScore}
                  onChange={(e) => setFormData({...formData, ourScore: e.target.value})}
                  min="0"
                  placeholder="比赛结束后填写"
                />
              </div>

              <div className={styles.formGroup}>
                <label>对方得分</label>
                <input
                  type="number"
                  value={formData.opponentScore}
                  onChange={(e) => setFormData({...formData, opponentScore: e.target.value})}
                  min="0"
                  placeholder="比赛结束后填写"
                />
              </div>

            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>场地费用 (元)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.fieldFeeTotal}
                  onChange={(e) => setFormData({...formData, fieldFeeTotal: e.target.value})}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>水费等杂费 (元)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.waterFeeTotal}
                  onChange={(e) => setFormData({...formData, waterFeeTotal: e.target.value})}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>费用系数 (元/时段)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.feeCoefficient}
                  onChange={(e) => setFormData({...formData, feeCoefficient: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>备注</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="比赛相关备注信息"
                rows={3}
              />
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.submitButton}>
                创建比赛
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={styles.matchesList}>
        <h2>比赛列表 ({matches.length})</h2>
        
        {matches.length === 0 ? (
          <div className={styles.emptyState}>
            <p>暂无比赛记录</p>
            <p>点击"创建新比赛"开始记录第一场比赛</p>
          </div>
        ) : (
          <div className={styles.matchesGrid}>
            {matches.map((match) => (
              <div 
                key={match.id} 
                className={styles.matchCard}
                onClick={() => handleMatchClick(match.id)}
              >
                <div className={styles.matchHeader}>
                  <div className={styles.matchDate}>
                    {new Date(match.matchDate).toLocaleDateString('zh-CN')}
                  </div>
                  <div className={`${styles.matchStatus} ${styles[match.status.toLowerCase()]}`}>
                    {match.status}
                  </div>
                </div>
                
                <div className={styles.matchTeams}>
                  <div className={styles.teamScore}>
                    <span className={styles.teamName}>METEOR</span>
                    <span className={styles.score}>{match.ourScore ?? '--'}</span>
                  </div>
                  <div className={styles.vs}>VS</div>
                  <div className={styles.teamScore}>
                    <span className={styles.score}>{match.opponentScore ?? '--'}</span>
                    <span className={styles.teamName}>{match.opponentTeam}</span>
                  </div>
                </div>

                {(() => {
                  const result = getMatchResult(match.ourScore, match.opponentScore)
                  return result && (
                    <div className={`${styles.matchResult} ${styles[result.toLowerCase()]}`}>
                      {result === 'WIN' ? '胜利' : 
                       result === 'LOSE' ? '失败' : '平局'}
                    </div>
                  )
                })()}

                <div className={styles.matchStats}>
                  <div className={styles.stat}>
                    <Users size={16} className={styles.statIcon} />
                    <span className={styles.statValue}>{match.totalParticipants}</span>
                    <span className={styles.statLabel}>参与人数</span>
                  </div>
                  <div className={styles.stat}>
                    <Target size={16} className={styles.statIcon} />
                    <span className={styles.statValue}>{match.totalGoals}</span>
                    <span className={styles.statLabel}>进球</span>
                  </div>
                  <div className={styles.stat}>
                    <Award size={16} className={styles.statIcon} />
                    <span className={styles.statValue}>{match.totalAssists}</span>
                    <span className={styles.statLabel}>助攻</span>
                  </div>
                  <div className={styles.stat}>
                    <DollarSign size={16} className={styles.statIcon} />
                    <span className={styles.statValue}>{match.totalCalculatedFees}</span>
                    <span className={styles.statLabel}>总费用</span>
                  </div>
                </div>

                <div className={styles.matchFooter}>
                  <span className={styles.createDate}>
                    创建于 {new Date(match.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}