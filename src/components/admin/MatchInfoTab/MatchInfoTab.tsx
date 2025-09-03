'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Trophy, DollarSign, Save, Target, Video, Link } from 'lucide-react'
import toast from 'react-hot-toast'
import { Match } from '@/types'
import styles from './MatchInfoTab.module.css'

interface MatchInfoTabProps {
  match: Match
  onMatchUpdate: (updatedMatch: Match) => void
  onUnsavedChanges: (hasChanges: boolean) => void
}

export default function MatchInfoTab({ 
  match, 
  onMatchUpdate, 
  onUnsavedChanges 
}: MatchInfoTabProps) {
  // Parse video info from notes if exists
  const parseVideoInfo = (notes: string | null) => {
    if (!notes) return { notes: '', videoUrl: '', videoExtractCode: '', videoDescription: '比赛录像' }
    
    try {
      const parsed = JSON.parse(notes)
      if (parsed.video) {
        return {
          notes: parsed.notes || '',
          videoUrl: parsed.video.url || '',
          videoExtractCode: parsed.video.extractCode || '',
          videoDescription: parsed.video.description || '比赛录像'
        }
      }
    } catch {
      // If parsing fails, treat as plain notes
    }
    return { notes, videoUrl: '', videoExtractCode: '', videoDescription: '比赛录像' }
  }

  const [initialVideoInfo, setInitialVideoInfo] = useState(() => parseVideoInfo(match.notes))
  
  const [formData, setFormData] = useState({
    opponentTeam: match.opponentTeam,
    matchDate: match.matchDate.split('T')[0], // Convert to YYYY-MM-DD format
    matchTime: match.matchTime ? new Date(match.matchTime).toTimeString().slice(0, 5) : '',
    ourScore: match.ourScore ?? '',
    opponentScore: match.opponentScore ?? '',
    fieldFeeTotal: Number(match.fieldFeeTotal),
    waterFeeTotal: Number(match.waterFeeTotal),
    feeCoefficient: Number(match.feeCoefficient),
    notes: initialVideoInfo.notes,
    videoUrl: initialVideoInfo.videoUrl,
    videoExtractCode: initialVideoInfo.videoExtractCode,
    videoDescription: initialVideoInfo.videoDescription
  })
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    const originalData = {
      opponentTeam: match.opponentTeam,
      matchDate: match.matchDate.split('T')[0],
      matchTime: match.matchTime ? new Date(match.matchTime).toTimeString().slice(0, 5) : '',
      ourScore: match.ourScore ?? '',
      opponentScore: match.opponentScore ?? '',
      fieldFeeTotal: Number(match.fieldFeeTotal),
      waterFeeTotal: Number(match.waterFeeTotal),
      feeCoefficient: Number(match.feeCoefficient),
      notes: initialVideoInfo.notes,
      videoUrl: initialVideoInfo.videoUrl,
      videoExtractCode: initialVideoInfo.videoExtractCode,
      videoDescription: initialVideoInfo.videoDescription
    }
    
    const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData)
    
    // Only update if the value actually changed
    if (hasUnsavedChanges !== hasChanges) {
      setHasUnsavedChanges(hasChanges)
      onUnsavedChanges(hasChanges)
    }
  }, [formData, match, initialVideoInfo, hasUnsavedChanges, onUnsavedChanges])

  const handleInputChange = (field: string, value: string | number) => {
    // Convert fee fields to numbers to ensure proper calculation
    let processedValue = value
    if (field === 'fieldFeeTotal' || field === 'waterFeeTotal' || field === 'feeCoefficient') {
      processedValue = value === '' ? 0 : Number(value)
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Combine notes with video info as JSON
      let notesWithVideo = formData.notes
      if (formData.videoUrl || formData.videoExtractCode || formData.videoDescription) {
        const videoInfo = {
          url: formData.videoUrl,
          extractCode: formData.videoExtractCode,
          description: formData.videoDescription || '比赛录像'
        }
        notesWithVideo = JSON.stringify({ notes: formData.notes, video: videoInfo })
      }

      const updateData = {
        opponentTeam: formData.opponentTeam,
        matchDate: new Date(formData.matchDate).toISOString(),
        matchTime: formData.matchTime ? new Date(`${formData.matchDate}T${formData.matchTime}`).toISOString() : null,
        ourScore: formData.ourScore === '' ? null : Number(formData.ourScore),
        opponentScore: formData.opponentScore === '' ? null : Number(formData.opponentScore),
        fieldFeeTotal: Number(formData.fieldFeeTotal),
        waterFeeTotal: Number(formData.waterFeeTotal),
        feeCoefficient: Number(formData.feeCoefficient),
        notes: notesWithVideo
      }

      const response = await fetch(`/api/admin/matches/${match.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      const data = await response.json()

      if (data.success) {
        const updatedMatch = { 
          ...match, 
          ...updateData, 
          matchTime: updateData.matchTime || undefined,
          ourScore: updateData.ourScore ?? undefined,
          opponentScore: updateData.opponentScore ?? undefined
        }
        
        // Parse the saved video info and update both form data and initial values
        const savedVideoInfo = parseVideoInfo(updatedMatch.notes)
        const newFormData = {
          opponentTeam: updatedMatch.opponentTeam,
          matchDate: updatedMatch.matchDate.split('T')[0],
          matchTime: updatedMatch.matchTime ? new Date(updatedMatch.matchTime).toTimeString().slice(0, 5) : '',
          ourScore: updatedMatch.ourScore ?? '',
          opponentScore: updatedMatch.opponentScore ?? '',
          fieldFeeTotal: Number(updatedMatch.fieldFeeTotal),
          waterFeeTotal: Number(updatedMatch.waterFeeTotal),
          feeCoefficient: Number(updatedMatch.feeCoefficient),
          notes: savedVideoInfo.notes,
          videoUrl: savedVideoInfo.videoUrl,
          videoExtractCode: savedVideoInfo.videoExtractCode,
          videoDescription: savedVideoInfo.videoDescription
        }
        
        setFormData(newFormData)
        // Update initial values to reflect the saved state
        setInitialVideoInfo(savedVideoInfo)
        
        // Force clear unsaved changes
        setHasUnsavedChanges(false)
        onUnsavedChanges(false)
        onMatchUpdate(updatedMatch)
        toast.success('比赛信息已更新')
      } else {
        toast.error(`更新失败: ${data.error?.message || '未知错误'}`)
      }
    } catch (error) {
      console.error('Error updating match:', error)
      toast.error('更新比赛信息时发生错误')
    } finally {
      setSaving(false)
    }
  }

  const getMatchResult = () => {
    const our = formData.ourScore === '' ? null : Number(formData.ourScore)
    const opponent = formData.opponentScore === '' ? null : Number(formData.opponentScore)
    
    if (our === null || opponent === null) return null
    
    if (our > opponent) return { text: '胜利', className: 'win' }
    if (our < opponent) return { text: '失败', className: 'lose' }
    return { text: '平局', className: 'draw' }
  }

  const result = getMatchResult()

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>比赛基本信息</h3>
        <button 
          className={styles.saveButton}
          onClick={handleSave}
          disabled={saving || !hasUnsavedChanges}
        >
          <Save size={16} />
          {saving ? '保存中...' : '保存信息'}
        </button>
      </div>

      <div className={styles.form}>
        <div className={styles.section}>
          <h4>比赛详情</h4>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>
                <Trophy size={16} />
                对手队伍
              </label>
              <input
                type="text"
                value={formData.opponentTeam}
                onChange={(e) => handleInputChange('opponentTeam', e.target.value)}
                placeholder="输入对手队伍名称"
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>
                <Calendar size={16} />
                比赛日期
              </label>
              <input
                type="date"
                value={formData.matchDate}
                onChange={(e) => handleInputChange('matchDate', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label>
                <Clock size={16} />
                比赛时间
              </label>
              <input
                type="time"
                value={formData.matchTime}
                onChange={(e) => handleInputChange('matchTime', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h4>比赛结果</h4>
          <div className={styles.scoreSection}>
            <div className={styles.scoreInputs}>
              <div className={styles.scoreField}>
                <label>我方得分</label>
                <input
                  type="number"
                  min="0"
                  value={formData.ourScore}
                  onChange={(e) => handleInputChange('ourScore', e.target.value)}
                  placeholder="--"
                />
              </div>
              <div className={styles.vs}>VS</div>
              <div className={styles.scoreField}>
                <label>对方得分</label>
                <input
                  type="number"
                  min="0"
                  value={formData.opponentScore}
                  onChange={(e) => handleInputChange('opponentScore', e.target.value)}
                  placeholder="--"
                />
              </div>
            </div>
            {result && (
              <div className={`${styles.result} ${styles[result.className]}`}>
                {result.text}
              </div>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <h4>费用设置</h4>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>
                <DollarSign size={16} />
                场地费用 (元)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.fieldFeeTotal}
                onChange={(e) => handleInputChange('fieldFeeTotal', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label>
                <DollarSign size={16} />
                水费等杂费 (元)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.waterFeeTotal}
                onChange={(e) => handleInputChange('waterFeeTotal', e.target.value)}
              />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>
                <Target size={16} />
                费用系数 (元/时段)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.feeCoefficient}
                onChange={(e) => handleInputChange('feeCoefficient', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h4>比赛录像</h4>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>
                <Link size={16} />
                录像链接
              </label>
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => handleInputChange('videoUrl', e.target.value)}
                placeholder="输入网盘链接或其他录像链接"
              />
            </div>
            <div className={styles.field}>
              <label>
                <Video size={16} />
                提取码
              </label>
              <input
                type="text"
                value={formData.videoExtractCode}
                onChange={(e) => handleInputChange('videoExtractCode', e.target.value)}
                placeholder="如果需要提取码，请输入"
              />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>录像描述</label>
              <input
                type="text"
                value={formData.videoDescription}
                onChange={(e) => handleInputChange('videoDescription', e.target.value)}
                placeholder="录像描述信息"
              />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h4>备注</h4>
          <div className={styles.field}>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="比赛备注信息..."
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  )
}