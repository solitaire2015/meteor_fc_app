'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  Minus,
  Trash2,
  Upload
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import toast, { Toaster } from 'react-hot-toast'
import ExcelImportSection from '@/components/admin/ExcelImport/ExcelImportSection'
import AssistantWidget from '@/components/ai/AssistantWidget'
import { type PatchEnvelope } from '@/lib/ai/schema'
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
  const [showExcelImport, setShowExcelImport] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [matchToDelete, setMatchToDelete] = useState<{ id: string; team: string } | null>(null)
  const [formData, setFormData] = useState({
    matchDate: '',
    matchTime: '',
    opponentTeam: '',
    ourScore: '',
    opponentScore: '',
    fieldFeeTotal: '1100',
    waterFeeTotal: '50',
    notes: ''
  })

  const formDataRef = useRef(formData)
  
  const router = useRouter()

  const applyMatchCreatePatch = useCallback((patch: PatchEnvelope) => {
    if (patch.target !== 'match_create') return

    patch.changes.forEach(change => {
      if (change.type !== 'match_info') return

      setFormData(prev => ({
        ...prev,
        opponentTeam: change.data.opponentTeam ?? prev.opponentTeam,
        matchDate: change.data.matchDate ?? prev.matchDate,
        matchTime: change.data.matchTime ?? prev.matchTime,
        ourScore:
          change.data.ourScore === null
            ? ''
            : change.data.ourScore !== undefined
              ? String(change.data.ourScore)
              : prev.ourScore,
        opponentScore:
          change.data.opponentScore === null
            ? ''
            : change.data.opponentScore !== undefined
              ? String(change.data.opponentScore)
              : prev.opponentScore,
        fieldFeeTotal:
          change.data.fieldFeeTotal !== undefined
            ? String(Math.ceil(change.data.fieldFeeTotal))
            : prev.fieldFeeTotal,
        waterFeeTotal:
          change.data.waterFeeTotal !== undefined
            ? String(Math.ceil(change.data.waterFeeTotal))
            : prev.waterFeeTotal,
        notes:
          change.data.notes === null
            ? ''
            : change.data.notes !== undefined
              ? change.data.notes
              : prev.notes
      }))
    })
  }, [])

  useEffect(() => {
    fetchMatches()
    fetchUsers()
  }, [])

  useEffect(() => {
    formDataRef.current = formData
  }, [formData])

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

  const createMatch = useCallback(async (data: typeof formData) => {
    const adminUser = users.find(u => u.name === '管理员') || users[0]
    if (!adminUser) {
      toast.error('需要管理员用户才能创建比赛')
      return
    }

    const matchData: any = {
      matchDate: new Date(data.matchDate).toISOString(),
      matchTime: data.matchTime ? new Date(`${data.matchDate}T${data.matchTime}`).toISOString() : undefined,
      opponentTeam: data.opponentTeam,
      ourScore: data.ourScore ? parseInt(data.ourScore) : undefined,
      opponentScore: data.opponentScore ? parseInt(data.opponentScore) : undefined,
      fieldFeeTotal: Math.ceil(parseFloat(data.fieldFeeTotal)),
      waterFeeTotal: Math.ceil(parseFloat(data.waterFeeTotal)),
      createdBy: adminUser.id
    }

    // Only add notes if it's not empty
    if (data.notes.trim()) {
      matchData.notes = data.notes.trim()
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
  }, [users, fetchMatches])

  const handleCreateMatch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    await createMatch(formDataRef.current)
  }, [createMatch])

  const handleAutoCreateFromAi = useCallback(async () => {
    const data = formDataRef.current
    if (!data.matchDate || !data.opponentTeam) {
      toast.error('AI 已填充，但缺少比赛日期或对手名称，无法自动创建')
      return
    }
    await createMatch(data)
  }, [createMatch])

  const handleMatchClick = (matchId: string) => {
    router.push(`/admin/matches/${matchId}`)
  }

  const handleDeleteMatch = async (matchId: string, matchTeam: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the match click
    setMatchToDelete({ id: matchId, team: matchTeam })
    setDeleteDialogOpen(true)
  }

  const confirmDeleteMatch = async () => {
    if (!matchToDelete) return

    try {
      const response = await fetch(`/api/games/${matchToDelete.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        await fetchMatches() // Refresh the list
        toast.success('比赛删除成功')
      } else {
        toast.error('删除比赛失败: ' + (data.error?.message || '未知错误'))
      }
    } catch (error) {
      console.error('Error deleting match:', error)
      toast.error('删除比赛时发生错误')
    } finally {
      setDeleteDialogOpen(false)
      setMatchToDelete(null)
    }
  }

  const cancelDeleteMatch = () => {
    setDeleteDialogOpen(false)
    setMatchToDelete(null)
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
      <AssistantWidget
        context={{
          page: 'admin/matches',
          matchId: null,
          locale: 'zh-CN',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          matchList: matches.map(match => ({
            id: match.id,
            matchDate: match.matchDate,
            matchTime: match.matchTime,
            opponentTeam: match.opponentTeam,
            ourScore: match.ourScore,
            opponentScore: match.opponentScore,
            status: match.status,
          })),
          availablePlayers: users.map(user => ({
            id: user.id,
            name: user.name,
            jerseyNumber: user.jerseyNumber,
            position: user.position
          })),
          formState: {
            matchInfo: formData
          }
        }}
        onApplyPatch={applyMatchCreatePatch}
        onAfterApplyAll={handleAutoCreateFromAi}
      />
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Button 
            variant="ghost"
            onClick={() => router.push('/admin')}
            className="gap-2"
          >
            <ArrowLeft size={16} />
            返回管理后台
          </Button>
          <h1>比赛管理</h1>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => {
              setShowExcelImport(!showExcelImport)
              // Close create form if it's open
              if (showCreateForm) setShowCreateForm(false)
            }}
            className="gap-2"
          >
            <Upload size={16} />
            Excel导入
          </Button>
          <Button 
            onClick={() => {
              setShowCreateForm(!showCreateForm)
              // Close excel import if it's open
              if (showExcelImport) setShowExcelImport(false)
            }}
            className="gap-2"
          >
            {showCreateForm ? <Minus size={16} /> : <Plus size={16} />}
            {showCreateForm ? '取消' : '创建新比赛'}
          </Button>
        </div>
      </header>

      {/* Excel Import Section */}
      <ExcelImportSection 
        isOpen={showExcelImport}
        onClose={() => setShowExcelImport(false)}
        onImportSuccess={fetchMatches}
      />

      {showCreateForm && (
        <div className={styles.createForm}>
          <h2>创建新比赛</h2>
          <form onSubmit={handleCreateMatch}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <Label>比赛日期 *</Label>
                <Input
                  type="date"
                  value={formData.matchDate}
                  onChange={(e) => setFormData({...formData, matchDate: e.target.value})}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <Label>比赛时间</Label>
                <Input
                  type="time"
                  value={formData.matchTime}
                  onChange={(e) => setFormData({...formData, matchTime: e.target.value})}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <Label>对手球队 *</Label>
              <Input
                type="text"
                value={formData.opponentTeam}
                onChange={(e) => setFormData({...formData, opponentTeam: e.target.value})}
                placeholder="输入对手球队名称"
                required
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <Label>我方得分</Label>
                <Input
                  type="number"
                  value={formData.ourScore}
                  onChange={(e) => setFormData({...formData, ourScore: e.target.value})}
                  min="0"
                  placeholder="比赛结束后填写"
                />
              </div>

              <div className={styles.formGroup}>
                <Label>对方得分</Label>
                <Input
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
                <Label>场地费用 (元)</Label>
                <Input
                  type="number"
                  step="1"
                  value={formData.fieldFeeTotal}
                  onChange={(e) => {
                    const nextValue = e.target.value
                    setFormData({
                      ...formData,
                      fieldFeeTotal: nextValue === '' ? '' : String(Math.ceil(Number(nextValue)))
                    })
                  }}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <Label>水费等杂费 (元)</Label>
                <Input
                  type="number"
                  step="1"
                  value={formData.waterFeeTotal}
                  onChange={(e) => {
                    const nextValue = e.target.value
                    setFormData({
                      ...formData,
                      waterFeeTotal: nextValue === '' ? '' : String(Math.ceil(Number(nextValue)))
                    })
                  }}
                  required
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <Label>备注</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="比赛相关备注信息"
                rows={3}
              />
            </div>

            <div className={styles.formActions}>
              <Button type="submit">
                创建比赛
              </Button>
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
                  <div className={styles.matchHeaderRight}>
                    <div className={`${styles.matchStatus} ${styles[match.status.toLowerCase()]}`}>
                      {match.status}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteMatch(match.id, match.opponentTeam, e)}
                      title="删除比赛"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
                
                <div className={styles.matchTeams}>
                  <div className={styles.teamScore}>
                    <span className={styles.teamName}>流星</span>
                    <span className={styles.score}>{match.ourScore ?? '--'}</span>
                  </div>
                  <div className={styles.vs}>VS</div>
                  <div className={styles.teamScore}>
                    <span className={styles.teamName}>{match.opponentTeam}</span>
                    <span className={styles.score}>{match.opponentScore ?? '--'}</span>
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
                    <span className={styles.statValue}>{Math.ceil(match.totalCalculatedFees)}</span>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 size={20} className="text-red-500" />
              确认删除比赛
            </DialogTitle>
            <div className="space-y-2 text-muted-foreground text-sm">
              <div>
                确定要删除与 <strong>"{matchToDelete?.team}"</strong> 的比赛吗？
              </div>
              <div className="text-red-600 font-medium">
                此操作将永久删除比赛记录、参与数据和事件记录，无法恢复。
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="flex gap-3">
            <Button variant="outline" onClick={cancelDeleteMatch}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDeleteMatch}>
              删除比赛
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
