'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import { Users, Shield, Target, Award, Timer, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { Dialog, Transition } from '@headlessui/react'
import toast from 'react-hot-toast'
import { User, AttendanceData, AttendanceDataJson } from '@/types'
import styles from './AttendanceGrid.module.css'

interface AttendanceGridProps {
  matchId: string
  users: User[]
  onAttendanceChange: (attendanceData: AttendanceData[]) => void
  initialAttendance?: AttendanceData[]
}

// Helper functions to convert between grid format and JSONb format
const convertGridToJsonb = (gridData: AttendanceData[], userId: string): AttendanceDataJson => {
  const userAttendances = gridData.filter(a => a.userId === userId)
  
  const attendance: AttendanceDataJson['attendance'] = {}
  const goalkeeper: AttendanceDataJson['goalkeeper'] = {}
  
  // Initialize all sections and parts to 0/false
  for (let section = 1; section <= 3; section++) {
    attendance[section.toString()] = {}
    goalkeeper[section.toString()] = {}
    for (let part = 1; part <= 3; part++) {
      attendance[section.toString()][part.toString()] = 0
      goalkeeper[section.toString()][part.toString()] = false
    }
  }
  
  // Set actual values from grid data
  userAttendances.forEach(a => {
    attendance[a.section.toString()][a.part.toString()] = a.value
    goalkeeper[a.section.toString()][a.part.toString()] = a.isGoalkeeper
  })
  
  return { attendance, goalkeeper }
}

const convertJsonbToGrid = (userId: string, jsonbData: AttendanceDataJson, isLateArrival: boolean = false, goals: number = 0, assists: number = 0): AttendanceData[] => {
  const gridData: AttendanceData[] = []
  
  for (let section = 1; section <= 3; section++) {
    for (let part = 1; part <= 3; part++) {
      const sectionStr = section.toString()
      const partStr = part.toString()
      
      const value = jsonbData.attendance?.[sectionStr]?.[partStr] || 0
      const isGoalkeeper = jsonbData.goalkeeper?.[sectionStr]?.[partStr] || false
      
      if (value > 0) {
        gridData.push({
          userId,
          section,
          part,
          value,
          isGoalkeeper,
          isLateArrival,
          goals: section === 1 && part === 1 ? goals : 0, // Only store goals/assists in first cell
          assists: section === 1 && part === 1 ? assists : 0
        })
      }
    }
  }
  
  return gridData
}

export default function AttendanceGrid({ 
  matchId, 
  users, 
  onAttendanceChange, 
  initialAttendance = [] 
}: AttendanceGridProps) {
  const [attendance, setAttendance] = useState<AttendanceData[]>(initialAttendance)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{section: number, part: number} | null>(null)
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set())
  const hasLoadedInitialData = useRef(false)

  // Update attendance when initialAttendance prop changes (for loading existing data)
  useEffect(() => {
    if (initialAttendance.length > 0 && !hasLoadedInitialData.current) {
      setAttendance(initialAttendance)
      hasLoadedInitialData.current = true
    }
  }, [initialAttendance])

  // Notify parent of attendance changes
  useEffect(() => {
    onAttendanceChange(attendance)
  }, [attendance, onAttendanceChange])

  const openGridModal = (section: number, part: number) => {
    setSelectedCell({ section, part })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedCell(null)
  }

  const getAttendanceForUser = (userId: string): AttendanceData | undefined => {
    return attendance.find(a => a.userId === userId)
  }

  const getAttendanceInCell = (section: number, part: number): AttendanceData[] => {
    return attendance.filter(a => a.section === section && a.part === part && a.value > 0)
  }

  const updateUserAttendance = (userId: string, section: number, part: number, value: number, isGoalkeeper: boolean = false) => {
    setAttendance(prev => {
      let updatedAttendance = [...prev]
      
      // Remove any existing attendance for this user in THIS SPECIFIC grid cell
      updatedAttendance = updatedAttendance.filter(a => 
        !(a.userId === userId && a.section === section && a.part === part)
      )
      
      // If setting someone as goalkeeper, remove goalkeeper status from others in this specific section+part
      if (isGoalkeeper && value > 0) {
        updatedAttendance = updatedAttendance.map(a => 
          a.section === section && a.part === part && a.isGoalkeeper ? { ...a, isGoalkeeper: false } : a
        )
      }
      
      if (value > 0) {
        // Create new attendance for this specific grid cell
        const newAttendance: AttendanceData = {
          userId,
          section,
          part,
          value,
          isGoalkeeper,
          isLateArrival: false,
          goals: 0,
          assists: 0
        }
        return [...updatedAttendance, newAttendance]
      } else {
        // Just remove the user from this specific cell (value = 0 means not participating)
        return updatedAttendance
      }
    })
    
    const user = users.find(u => u.id === userId)
    const timeText = value === 1 ? '全程' : value === 0.5 ? '半程' : '未参与'
    const roleText = isGoalkeeper ? ' (门将)' : ''
    toast.success(`${user?.name} 已设置为 ${timeText}${roleText}`)
  }

  const removeUserFromAttendance = (userId: string) => {
    setAttendance(prev => prev.filter(a => a.userId !== userId))
    toast.success('球员已移除')
  }

  const updateUserData = (userId: string, updates: Partial<AttendanceData>) => {
    setAttendance(prev => prev.map(a => 
      a.userId === userId ? { ...a, ...updates } : a
    ))
  }

  const togglePlayerExpand = (userId: string) => {
    setExpandedPlayers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  const getTotalStats = () => {
    const totalParticipants = new Set(attendance.filter(a => a.value > 0).map(a => a.userId)).size
    const totalGoals = attendance.reduce((sum, a) => sum + a.goals, 0)
    const totalAssists = attendance.reduce((sum, a) => sum + a.assists, 0)
    
    // Count unique goalkeeper positions (section+part specific)
    const goalkeeperPositions = new Set<string>()
    attendance.filter(a => a.isGoalkeeper && a.value > 0).forEach(a => {
      goalkeeperPositions.add(`${a.userId}-${a.section}-${a.part}`)
    })
    const goalkeepers = goalkeeperPositions.size
    
    const lateArrivals = new Set(attendance.filter(a => a.isLateArrival && a.value > 0).map(a => a.userId)).size
    
    return { totalParticipants, totalGoals, totalAssists, goalkeepers, lateArrivals }
  }

  const stats = getTotalStats()
  const attendingUsers = attendance.filter(a => a.value > 0)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>出勤管理</h3>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <Users size={16} />
            <span>{stats.totalParticipants}</span>
            <span>参与人数</span>
          </div>
          <div className={styles.stat}>
            <Shield size={16} />
            <span>{stats.goalkeepers}</span>
            <span>门将</span>
          </div>
          <div className={styles.stat}>
            <Timer size={16} />
            <span>{stats.lateArrivals}</span>
            <span>迟到</span>
          </div>
          <div className={styles.stat}>
            <Target size={16} />
            <span>{stats.totalGoals}</span>
            <span>进球</span>
          </div>
          <div className={styles.stat}>
            <Award size={16} />
            <span>{stats.totalAssists}</span>
            <span>助攻</span>
          </div>
        </div>
      </div>

      <div className={styles.attendanceGrid}>
        <div className={styles.gridHeader}>
          <h4>3×3 出勤网格</h4>
          <p>点击网格单元格来分配球员时间</p>
        </div>

        <div className={styles.grid}>
          {[1, 2, 3].map(section => (
            <div key={section} className={styles.section}>
              <div className={styles.sectionHeader}>第{section}节</div>
              <div className={styles.parts}>
                {[1, 2, 3].map(part => {
                  const usersInCell = getAttendanceInCell(section, part)
                  
                  return (
                    <div 
                      key={`${section}-${part}`} 
                      className={styles.part}
                      onClick={() => openGridModal(section, part)}
                    >
                      <div className={styles.partHeader}>
                        第{part}部分
                        <Plus size={14} />
                      </div>
                      <div className={styles.partUsers}>
                        {usersInCell.map(attendance => {
                          const user = users.find(u => u.id === attendance.userId)
                          return (
                            <div key={`${attendance.userId}-${attendance.section}-${attendance.part}`} className={styles.partUser}>
                              <span className={styles.userName}>
                                {user?.name}
                                {user?.jerseyNumber && ` #${user.jerseyNumber}`}
                              </span>
                              <div className={styles.userIndicators}>
                                <span className={`${styles.timeValue} ${styles[`value${attendance.value.toString().replace('.', '_')}`]}`}>
                                  {attendance.value === 1 ? '全程' : attendance.value === 0.5 ? '半程' : ''}
                                </span>
                                {attendance.isGoalkeeper && (
                                  <span className={styles.goalkeeperIndicator} title={`门将`}>
                                    <Shield size={12} className={styles.icon} />
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        {usersInCell.length === 0 && (
                          <div className={styles.emptyCell}>点击添加球员</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Player Statistics - Goals, Assists, Late Arrivals */}
      <div className={styles.playerList}>
        <h4>球员数据管理</h4>
        <p className={styles.playerListDescription}>管理球员的进球、助攻和迟到信息</p>
        <div className={styles.players}>
          {attendingUsers.length === 0 ? (
            <div className={styles.emptyState}>
              <p>暂无球员参与此比赛</p>
              <p>请在上方网格中添加球员</p>
            </div>
          ) : (
            // Group attending users by unique userId
            Array.from(new Set(attendingUsers.map(a => a.userId))).map(userId => {
              const user = users.find(u => u.id === userId)
              const userAttendances = attendingUsers.filter(a => a.userId === userId)
              const totalGoals = userAttendances.reduce((sum, a) => sum + a.goals, 0)
              const totalAssists = userAttendances.reduce((sum, a) => sum + a.assists, 0)
              const isLate = userAttendances.some(a => a.isLateArrival)
              const isExpanded = expandedPlayers.has(userId)
              
              return (
                <div key={userId} className={`${styles.player} ${styles.attending}`}>
                  <div className={styles.playerHeader}>
                    <div className={styles.playerBasic}>
                      <span className={styles.userName}>
                        {user?.name}
                        {user?.jerseyNumber && ` #${user?.jerseyNumber}`}
                      </span>
                      {user?.position && (
                        <span className={styles.position}>{user.position}</span>
                      )}
                      <span className={styles.playerStats}>
                        进球: {totalGoals} | 助攻: {totalAssists}
                        {isLate && ' | 迟到'}
                      </span>
                    </div>
                    <button
                      onClick={() => togglePlayerExpand(userId)}
                      className={styles.expandButton}
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className={styles.playerDetails}>
                      <div className={styles.detailRow}>
                        <label>
                          <input
                            type="checkbox"
                            checked={isLate}
                            onChange={(e) => {
                              // Update all attendances for this user
                              setAttendance(prev => prev.map(a => 
                                a.userId === userId ? { ...a, isLateArrival: e.target.checked } : a
                              ))
                            }}
                          />
                          迟到
                        </label>
                      </div>
                      <div className={styles.detailRow}>
                        <div className={styles.numberInput}>
                          <label>进球:</label>
                          <input
                            type="number"
                            min="0"
                            value={totalGoals}
                            onChange={(e) => {
                              const newGoals = parseInt(e.target.value) || 0
                              // Update the first attendance record with goals
                              setAttendance(prev => prev.map((a, index) => {
                                if (a.userId === userId) {
                                  // Only the first attendance gets the goals
                                  const isFirst = prev.findIndex(att => att.userId === userId) === index
                                  return { ...a, goals: isFirst ? newGoals : 0 }
                                }
                                return a
                              }))
                            }}
                          />
                        </div>
                        <div className={styles.numberInput}>
                          <label>助攻:</label>
                          <input
                            type="number"
                            min="0"
                            value={totalAssists}
                            onChange={(e) => {
                              const newAssists = parseInt(e.target.value) || 0
                              // Update the first attendance record with assists
                              setAttendance(prev => prev.map((a, index) => {
                                if (a.userId === userId) {
                                  // Only the first attendance gets the assists
                                  const isFirst = prev.findIndex(att => att.userId === userId) === index
                                  return { ...a, assists: isFirst ? newAssists : 0 }
                                }
                                return a
                              }))
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Grid Assignment Modal */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className={styles.modal} onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter={styles.modalEnter}
            enterFrom={styles.modalEnterFrom}
            enterTo={styles.modalEnterTo}
            leave={styles.modalLeave}
            leaveFrom={styles.modalLeaveFrom}
            leaveTo={styles.modalLeaveTo}
          >
            <div className={styles.modalBackdrop} />
          </Transition.Child>

          <div className={styles.modalContainer}>
            <div className={styles.modalContent}>
              <Transition.Child
                as={Fragment}
                enter={styles.modalEnter}
                enterFrom={styles.modalEnterFrom}
                enterTo={styles.modalEnterTo}
                leave={styles.modalLeave}
                leaveFrom={styles.modalLeaveFrom}
                leaveTo={styles.modalLeaveTo}
              >
                <Dialog.Panel className={styles.modalPanel}>
                  <Dialog.Title className={styles.modalTitle}>
                    分配球员到第{selectedCell?.section}节第{selectedCell?.part}部分
                  </Dialog.Title>

                  <div className={styles.modalBody}>
                    {users.map(user => {
                      // Check if user has attendance in this specific cell
                      const cellAttendance = attendance.find(a => 
                        a.userId === user.id && 
                        a.section === selectedCell?.section && 
                        a.part === selectedCell?.part
                      )
                      const currentValue = cellAttendance?.value || 0
                      const isGoalkeeper = cellAttendance?.isGoalkeeper || false
                      
                      return (
                        <div key={user.id} className={styles.modalUserRow}>
                          <div className={styles.modalUserName}>
                            {user.name}
                            {user.jerseyNumber && ` #${user.jerseyNumber}`}
                          </div>
                          
                          <div className={styles.timeSelector}>
                            {[0, 0.5, 1].map(value => (
                              <button
                                key={value}
                                onClick={() => {
                                  if (selectedCell) {
                                    updateUserAttendance(user.id, selectedCell.section, selectedCell.part, value, isGoalkeeper)
                                  }
                                }}
                                className={`${styles.timeButton} ${
                                  currentValue === value ? styles.active : ''
                                } ${value === 0 ? styles.none : value === 0.5 ? styles.half : styles.full}`}
                              >
                                {value === 0 ? '不参与' : value === 0.5 ? '半程' : '全程'}
                              </button>
                            ))}
                          </div>
                          
                          <label className={styles.goalkeeperLabel}>
                            <input
                              type="checkbox"
                              checked={isGoalkeeper}
                              onChange={(e) => {
                                if (selectedCell && currentValue > 0) {
                                  updateUserAttendance(user.id, selectedCell.section, selectedCell.part, currentValue, e.target.checked)
                                }
                              }}
                              disabled={currentValue === 0}
                            />
                            门将
                          </label>
                        </div>
                      )
                    })}
                  </div>

                  <div className={styles.modalActions}>
                    <button onClick={closeModal} className={styles.closeButton}>
                      完成
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}