'use client'

import { useCallback, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import EnhancedAttendanceGrid from '@/components/custom/EnhancedAttendanceGrid'
import DetailedEventLogger from '@/components/custom/DetailedEventLogger'
import SimplePlayerSelector from '@/components/custom/SimplePlayerSelector'
import {
  useUpdateAttendance,
  useSaveAttendance,
  useGetAttendanceStats,
  useAttendanceData,
  useEvents,
  useAddEvent,
  useRemoveEvent,
  useSelectedPlayers,
  useAvailablePlayers,
  useSetSelectedPlayers,
  useSaveSelectedPlayers,
  useLoadPlayers,
  useIsDirty,
  useIsLoading
} from '@/stores/useMatchStore'
import { type MatchInfo, type Player, type AttendanceGrid as AttendanceGridType } from '@/lib/validations/match'
import styles from './AttendanceTab.module.css'

interface AttendanceTabProps {
  match: MatchInfo
  users: Player[]
  initialAttendance: AttendanceGridType
}

export default function AttendanceTab({
  match,
  users,
  initialAttendance
}: AttendanceTabProps) {
  // Store state
  const attendanceData = useAttendanceData()
  const events = useEvents()
  const selectedPlayersRaw = useSelectedPlayers()
  const selectedPlayers = selectedPlayersRaw.filter(p => p.playerStatus !== 'VACATION')
  const availablePlayers = useAvailablePlayers()
  const isDirty = useIsDirty()
  const isLoading = useIsLoading()

  // Store actions
  const updateAttendance = useUpdateAttendance()
  const addEvent = useAddEvent()
  const removeEvent = useRemoveEvent()
  const saveAttendance = useSaveAttendance()
  const setSelectedPlayers = useSetSelectedPlayers()
  const saveSelectedPlayers = useSaveSelectedPlayers()
  const loadPlayers = useLoadPlayers()
  const getAttendanceStats = useGetAttendanceStats()

  // Load players when component mounts
  useEffect(() => {
    if (match?.id && availablePlayers.length === 0 && !isLoading.players) {
      loadPlayers(match.id)
    }
  }, [match?.id, loadPlayers, availablePlayers.length, isLoading.players])

  // Handle attendance changes (optimistic update)
  const handleAttendanceChange = useCallback((newAttendanceData: AttendanceGridType) => {
    updateAttendance(newAttendanceData)
  }, [updateAttendance])

  // Handle save attendance
  const handleSave = useCallback(async () => {
    try {
      await saveAttendance()
    } catch (error) {
      console.error('Error saving attendance:', error)
    }
  }, [saveAttendance])

  // Handle player selection changes
  const handlePlayerSelectionChange = useCallback((players: Player[]) => {
    setSelectedPlayers(players)
  }, [setSelectedPlayers])

  // Handle save selected players
  const handleSaveSelectedPlayers = useCallback(async () => {
    try {
      await saveSelectedPlayers()
    } catch (error) {
      console.error('Error saving selected players:', error)
    }
  }, [saveSelectedPlayers])

  // Get computed stats
  const stats = getAttendanceStats()

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3>出勤管理</h3>
          {stats.totalParticipants > 0 && (
            <div className={styles.statsPreview}>
              <span className={styles.stat}>参与者: {stats.totalParticipants}</span>
              <span className={styles.stat}>进球: {stats.totalGoals}</span>
              <span className={styles.stat}>助攻: {stats.totalAssists}</span>
              {stats.lateArrivals > 0 && (
                <span className={styles.stat}>迟到: {stats.lateArrivals}</span>
              )}
            </div>
          )}
        </div>
        <div className={styles.headerRight}>
          <Button
            onClick={handleSave}
            disabled={isLoading.saving || !isDirty.attendance}
            className="gap-2"
          >
            <Save size={16} />
            {isLoading.saving ? '保存中...' : '保存出勤'}
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        {/* Player Selection Section */}
        <SimplePlayerSelector
          availablePlayers={availablePlayers}
          selectedPlayers={selectedPlayers}
          onSelectionChange={handlePlayerSelectionChange}
          onSave={handleSaveSelectedPlayers}
          isDirty={isDirty.players}
          isSaving={isLoading.saving}
          className="mb-6"
        />

        {/* Enhanced Attendance Grid - Only shows selected players */}
        <EnhancedAttendanceGrid
          players={selectedPlayers}
          attendanceData={attendanceData}
          onChange={handleAttendanceChange}
          isDirty={isDirty.attendance}
          className="mb-6"
        />

        {/* Detailed Event Logger */}
        <DetailedEventLogger
          players={selectedPlayers}
          events={events}
          onAddEvent={addEvent}
          onRemoveEvent={removeEvent}
          attendanceData={attendanceData}
          isDirty={isDirty.attendance}
        />
      </div>

      {/* Instructions */}
      <div className={styles.instructions}>
        <h4>操作说明:</h4>
        <ul>
          <li>点击格子设置出勤值: 0 → 0.5 → 1.0 → 0</li>
          <li>勾选"门将"可设置该时段的守门员</li>
          <li>每个时段只能有一个守门员</li>
          <li>勾选"迟到"会自动添加10元迟到费</li>
          <li>使用下方事件记录器添加进球、助攻、红黄牌等详细信息</li>
        </ul>
      </div>
    </div>
  )
}