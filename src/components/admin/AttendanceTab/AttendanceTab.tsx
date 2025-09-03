'use client'

import { useState, useEffect, useCallback } from 'react'
import { Save } from 'lucide-react'
import toast from 'react-hot-toast'
import AttendanceGrid from '@/components/shared/AttendanceGrid'
import { Match, User, AttendanceData } from '@/types'
import styles from './AttendanceTab.module.css'

interface AttendanceTabProps {
  match: Match
  users: User[]
  initialAttendance: AttendanceData[]
  onAttendanceUpdate: (attendance: AttendanceData[]) => void
  onUnsavedChanges: (hasChanges: boolean) => void
}

export default function AttendanceTab({ 
  match, 
  users, 
  initialAttendance, 
  onAttendanceUpdate,
  onUnsavedChanges 
}: AttendanceTabProps) {
  const [attendance, setAttendance] = useState<AttendanceData[]>(initialAttendance)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    setAttendance(initialAttendance)
  }, [initialAttendance])

  useEffect(() => {
    const hasChanges = JSON.stringify(attendance) !== JSON.stringify(initialAttendance)
    
    // Only update if the value actually changed
    if (hasUnsavedChanges !== hasChanges) {
      setHasUnsavedChanges(hasChanges)
      onUnsavedChanges(hasChanges)
    }
  }, [attendance, initialAttendance, hasUnsavedChanges, onUnsavedChanges])

  const handleAttendanceChange = useCallback((attendanceData: AttendanceData[]) => {
    setAttendance(attendanceData)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const totalParticipants = new Set(attendance.filter(a => a.value > 0).map(a => a.userId)).size
      const totalGoals = attendance.reduce((sum, a) => sum + a.goals, 0)
      const totalAssists = attendance.reduce((sum, a) => sum + a.assists, 0)
      
      const totalCalculatedFees = Math.round(
        (Number(match.fieldFeeTotal) + Number(match.waterFeeTotal)) + 
        (totalParticipants * Number(match.feeCoefficient))
      )

      const response = await fetch(`/api/admin/matches/${match.id}/save-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendance,
          totalParticipants,
          totalGoals,
          totalAssists,
          totalCalculatedFees
        })
      })

      const data = await response.json()

      if (data.success) {
        // Force clear unsaved changes
        setHasUnsavedChanges(false)
        onUnsavedChanges(false)
        onAttendanceUpdate(attendance)
        toast.success(`出勤数据保存成功！保存了 ${data.data.participantsCount} 名参与者，${data.data.eventsCount} 个事件`)
      } else {
        toast.error(`保存出勤数据失败: ${data.error?.message || '未知错误'}`)
      }
    } catch (error) {
      console.error('Error saving attendance:', error)
      toast.error('保存出勤数据时发生错误')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>出勤管理</h3>
        <button 
          className={styles.saveButton}
          onClick={handleSave}
          disabled={saving || !hasUnsavedChanges}
        >
          <Save size={16} />
          {saving ? '保存中...' : '保存出勤'}
        </button>
      </div>

      <div className={styles.content}>
        <AttendanceGrid
          matchId={match.id}
          users={users}
          onAttendanceChange={handleAttendanceChange}
          initialAttendance={attendance}
        />
      </div>
    </div>
  )
}