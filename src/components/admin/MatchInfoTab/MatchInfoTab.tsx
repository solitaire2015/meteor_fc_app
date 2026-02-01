'use client'

import { useState, useCallback, useEffect } from 'react'
import { Calendar, Clock, Trophy, DollarSign, Save, LayoutGrid } from 'lucide-react'
import { useUpdateMatchInfo, useSaveMatchInfo, useIsDirty, useIsLoading } from '@/stores/useMatchStore'
import { type MatchInfo } from '@/lib/validations/match'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import styles from './MatchInfoTab.module.css'

interface MatchInfoTabProps {
  match: MatchInfo
}

export default function MatchInfoTab({
  match
}: MatchInfoTabProps) {
  // Store state
  const isDirty = useIsDirty()
  const isLoading = useIsLoading()

  // Store actions
  const updateMatchInfo = useUpdateMatchInfo()
  const saveMatchInfo = useSaveMatchInfo()

  // Form state
  const toFormData = useCallback((source: MatchInfo) => ({
    opponentTeam: source.opponentTeam,
    matchDate: source.matchDate.split('T')[0], // Convert to YYYY-MM-DD format
    matchTime: source.matchTime ? new Date(source.matchTime).toTimeString().slice(0, 5) : '',
    sectionCount: source.sectionCount ?? 3,
    ourScore: source.ourScore ?? '',
    opponentScore: source.opponentScore ?? '',
    fieldFeeTotal: Math.round(Number(source.fieldFeeTotal)),
    waterFeeTotal: Math.round(Number(source.waterFeeTotal)),
    notes: source.notes || '',
  }), [])

  const [formData, setFormData] = useState(() => toFormData(match))

  useEffect(() => {
    setFormData(toFormData(match))
  }, [match, toFormData])

  // Handle input changes (optimistic update)
  const handleInputChange = useCallback((field: string, value: string | number) => {
    let processedValue = value
    let displayValue = value

    // Convert fee fields to numbers
    if (field === 'fieldFeeTotal' || field === 'waterFeeTotal') {
      const numValue = value === '' ? 0 : Number(value)
      if (numValue < 0) {
        return // Don't allow negative values
      }
      const roundedValue = Math.round(numValue)
      processedValue = roundedValue
      displayValue = roundedValue
    }

    // Handle score fields - convert to number or null
    if (field === 'ourScore' || field === 'opponentScore') {
      if (value === '' || value === null || value === undefined) {
        processedValue = null
      } else {
        const numValue = Number(value)
        if (isNaN(numValue) || numValue < 0) {
          return // Don't allow invalid or negative values
        }
        processedValue = numValue
      }
    }

    // Handle section count
    if (field === 'sectionCount') {
      const numValue = Number(value)
      if (!Number.isFinite(numValue) || numValue < 1 || numValue > 6) return
      processedValue = Math.trunc(numValue)
      displayValue = Math.trunc(numValue)
    }

    // Handle date/time fields - convert to proper datetime strings
    if (field === 'matchDate') {
      // Convert date to datetime string for matchDate field
      const dateStr = value as string
      // matchDate should always be ISO datetime - use start of day
      processedValue = new Date(`${dateStr}T00:00:00.000Z`).toISOString()

      // Also update matchTime if it exists, to keep them in sync
      const timeStr = formData.matchTime
      if (timeStr) {
        // Update the store for both date and time fields
        updateMatchInfo({
          matchDate: processedValue,
          matchTime: new Date(`${dateStr}T${timeStr}:00.000Z`).toISOString()
        })
        return // Skip the regular update below since we already updated the store
      }
    }

    if (field === 'matchTime') {
      // Convert time to datetime string (combine with existing date)
      const timeStr = value as string
      const dateStr = formData.matchDate

      if (timeStr === '') {
        // Empty time should be null
        processedValue = null
      } else if (timeStr && dateStr) {
        // Combine date and time into ISO datetime string for matchTime
        processedValue = new Date(`${dateStr}T${timeStr}:00.000Z`).toISOString()
      } else {
        // Can't create datetime without date, keep as is for form display
        processedValue = timeStr
      }
    }

    setFormData(prev => ({
      ...prev,
      [field]: displayValue
    }))

    // Update store immediately (optimistic update)
    const updateData: Partial<MatchInfo> = {}
    updateData[field as keyof MatchInfo] = processedValue as any
    updateMatchInfo(updateData)
  }, [updateMatchInfo, formData.matchDate, formData.matchTime])

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      await saveMatchInfo()
    } catch (error) {
      console.error('Error saving match info:', error)
    }
  }, [saveMatchInfo])

  // Get match result
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
        <Button
          onClick={handleSave}
          disabled={isLoading.saving || !isDirty.info}
          className="flex items-center gap-2"
        >
          <Save size={16} />
          {isLoading.saving ? '保存中...' : '保存信息'}
        </Button>
      </div>

      <div className={styles.form}>
        <div className={styles.section}>
          <h4>比赛详情</h4>
          <div className={styles.row}>
            <div className={styles.field}>
              <Label className="flex items-center gap-2">
                <Trophy size={16} />
                对手队伍
              </Label>
              <Input
                type="text"
                value={formData.opponentTeam}
                onChange={(e) => handleInputChange('opponentTeam', e.target.value)}
                placeholder="输入对手队伍名称"
              />
            </div>

            <div className={styles.field}>
              <Label className="flex items-center gap-2">
                <LayoutGrid size={16} />
                比赛节数
              </Label>
              <Input
                type="number"
                min="1"
                max="6"
                step="1"
                value={formData.sectionCount}
                onChange={(e) => handleInputChange('sectionCount', e.target.value)}
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <Label className="flex items-center gap-2">
                <Calendar size={16} />
                比赛日期
              </Label>
              <Input
                type="date"
                value={formData.matchDate}
                onChange={(e) => handleInputChange('matchDate', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <Label className="flex items-center gap-2">
                <Clock size={16} />
                比赛时间
              </Label>
              <Input
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
                <Label>我方得分</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.ourScore}
                  onChange={(e) => handleInputChange('ourScore', e.target.value)}
                  placeholder="--"
                />
              </div>
              <div className={styles.vs}>VS</div>
              <div className={styles.scoreField}>
                <Label>对方得分</Label>
                <Input
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
              <Label className="flex items-center gap-2">
                <DollarSign size={16} />
                场地费用 (元)
              </Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={formData.fieldFeeTotal}
                onChange={(e) => handleInputChange('fieldFeeTotal', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <Label className="flex items-center gap-2">
                <DollarSign size={16} />
                水费等杂费 (元)
              </Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={formData.waterFeeTotal}
                onChange={(e) => handleInputChange('waterFeeTotal', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h4>备注</h4>
          <div className={styles.field}>
            <Textarea
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
