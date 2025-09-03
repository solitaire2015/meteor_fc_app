'use client'

import { useState, useEffect, useMemo } from 'react'
import { DollarSign, Calculator, Users, Clock, CreditCard, User, AlertCircle, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { User as UserType, AttendanceData, Match, FinancialData, PlayerFinancialData } from '@/types'
import { calculatePlayerFees, AttendanceData as FeeAttendanceData } from '@/lib/feeCalculation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import styles from './FinancialCalculator.module.css'

interface ParticipationNote {
  userId: string
  notes: string
}

interface AttendancePlayer {
  userId: string
  notes?: string
}


interface FinancialCalculatorProps {
  match: Match
  attendance: AttendanceData[]
  users: UserType[]
  onFinancialUpdate: (financialData: FinancialData) => void
}


export default function FinancialCalculator({ 
  match, 
  attendance, 
  users, 
  onFinancialUpdate 
}: FinancialCalculatorProps) {
  const [lateFeeAmount, setLateFeeAmount] = useState(10) // Constant 10 yuan late fee
  const [paymentProxies, setPaymentProxies] = useState<{[userId: string]: string}>({})
  const [saving, setSaving] = useState(false)
  const [hasUnsavedNotes, setHasUnsavedNotes] = useState(false)

  // Load existing notes on mount
  useEffect(() => {
    const loadExistingNotes = async () => {
      try {
        const response = await fetch(`/api/admin/matches/${match.id}/save-details`)
        const data = await response.json()
        
        if (data.success) {
          const notesMap: {[userId: string]: string} = {}
          
          // Load notes from participationNotes if available
          if (data.data.participationNotes) {
            data.data.participationNotes.forEach((note: ParticipationNote) => {
              if (note.notes) {
                notesMap[note.userId] = note.notes
              }
            })
          }
          
          // Also check attendance data for notes (fallback)
          if (data.data.attendance) {
            data.data.attendance.forEach((player: AttendancePlayer) => {
              if (player.notes && !notesMap[player.userId]) {
                notesMap[player.userId] = player.notes
              }
            })
          }
          
          if (Object.keys(notesMap).length > 0) {
            setPaymentProxies(notesMap)
          }
        }
      } catch (error) {
        console.log('No existing notes found')
      }
    }
    
    loadExistingNotes()
  }, [match.id])

  // Calculate financial data
  const financialData = useMemo((): FinancialData => {
    // Get unique participating users
    const participatingUsers = new Set(attendance.filter(a => a.value > 0).map(a => a.userId))
    
    const playerFinancials: PlayerFinancialData[] = Array.from(participatingUsers).map(userId => {
      const user = users.find(u => u.id === userId)
      const userAttendances = attendance.filter(a => a.userId === userId && a.value > 0)
      
      // Calculate total time from all attendance records (for display purposes)
      const totalTime = userAttendances.reduce((sum, a) => sum + a.value, 0)
      
      // Check if user is late (any attendance record marked as late)
      const isLate = userAttendances.some(a => a.isLateArrival)
      
      // Convert attendance data to centralized format
      const attendanceData: FeeAttendanceData = {
        attendance: {
          "1": {"1": 0, "2": 0, "3": 0},
          "2": {"1": 0, "2": 0, "3": 0},
          "3": {"1": 0, "2": 0, "3": 0}
        },
        goalkeeper: {
          "1": {"1": false, "2": false, "3": false},
          "2": {"1": false, "2": false, "3": false},
          "3": {"1": false, "2": false, "3": false}
        }
      }
      
      // Populate attendance data from userAttendances
      userAttendances.forEach(attendance => {
        const section = attendance.section.toString()
        const part = attendance.part.toString()
        attendanceData.attendance[section][part] = attendance.value
        attendanceData.goalkeeper[section][part] = attendance.isGoalkeeper || false
      })
      
      // Use centralized fee calculation
      const fees = calculatePlayerFees({
        attendanceData,
        isLateArrival: isLate,
        feeCoefficient: Number(match.feeCoefficient)
      })
      
      return {
        userId,
        userName: user?.name || '未知用户',
        totalTime,
        fieldFeeCalculated: fees.fieldFee,
        lateFee: fees.lateFee,
        videoFee: fees.videoFee,
        totalFeeCalculated: fees.totalFee,
        paymentProxy: paymentProxies[userId],
        isLate
      }
    })

    // Calculate totals
    const totalParticipants = playerFinancials.length
    const totalFieldFees = playerFinancials.reduce((sum, p) => sum + p.fieldFeeCalculated, 0)
    const totalVideoFees = playerFinancials.reduce((sum, p) => sum + p.videoFee, 0)
    const totalLateFees = playerFinancials.reduce((sum, p) => sum + p.lateFee, 0)
    const grandTotal = totalFieldFees + totalVideoFees + totalLateFees
    const averageFeePerPlayer = totalParticipants > 0 ? Math.round(grandTotal / totalParticipants) : 0

    return {
      totalParticipants,
      totalFieldFees,
      totalVideoFees,
      totalLateFees,
      grandTotal,
      averageFeePerPlayer,
      playerFinancials
    }
  }, [attendance, users, match.feeCoefficient, lateFeeAmount, paymentProxies])

  // Notify parent of financial data changes
  useEffect(() => {
    onFinancialUpdate(financialData)
  }, [financialData, onFinancialUpdate])

  const handlePaymentProxyChange = (userId: string, proxy: string) => {
    setPaymentProxies(prev => ({
      ...prev,
      [userId]: proxy
    }))
    setHasUnsavedNotes(true)
  }

  const handleSaveNotes = async () => {
    setSaving(true)
    try {
      const participationNotes = Object.entries(paymentProxies)
        .filter(([_, notes]) => notes.trim() !== '')
        .map(([userId, notes]) => ({ userId, notes }))

      const response = await fetch(`/api/admin/matches/${match.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ participationNotes })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('代付备注已保存')
        setHasUnsavedNotes(false)
      } else {
        toast.error(`保存失败: ${data.error?.message || '未知错误'}`)
      }
    } catch (error) {
      console.error('Error saving notes:', error)
      toast.error('保存备注信息时发生错误')
    } finally {
      setSaving(false)
    }
  }

  // Calculate base costs from match data (ensure numbers)
  const baseCosts = {
    fieldFee: Number(match.fieldFeeTotal),
    waterFee: Number(match.waterFeeTotal),
    totalBaseCosts: Number(match.fieldFeeTotal) + Number(match.waterFeeTotal)
  }

  // Calculate difference between collected fees and base costs
  const feeDifference = financialData.grandTotal - baseCosts.totalBaseCosts
  const isDifferencePositive = feeDifference > 0

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>
          <Calculator size={20} />
          财务计算器
        </h3>
        <p>自动计算每位球员的费用分摊</p>
      </div>

      {/* Configuration Section */}
      <div className={styles.configSection}>
        <h4>费用设置</h4>
        <div className={styles.configGrid}>
          <div className={styles.configItem}>
            <label>视频费用:</label>
            <span className={styles.autoCalculated}>每节 2 元</span>
          </div>
          <div className={styles.configItem}>
            <label>迟到罚款:</label>
            <div className={styles.inputGroup}>
              <Input
                type="number"
                min={0}
                value={lateFeeAmount}
                onChange={(e) => setLateFeeAmount(parseInt(e.target.value) || 0)}
                className="w-20"
              />
              <span>元</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className={styles.summarySection}>
        <h4>费用汇总</h4>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryIcon}>
              <Users size={20} />
            </div>
            <div className={styles.summaryContent}>
              <span className={styles.summaryValue}>{financialData.totalParticipants}</span>
              <span className={styles.summaryLabel}>参与人数</span>
            </div>
          </div>
          
          <div className={styles.summaryCard}>
            <div className={styles.summaryIcon}>
              <DollarSign size={20} />
            </div>
            <div className={styles.summaryContent}>
              <span className={styles.summaryValue}>{financialData.totalFieldFees}</span>
              <span className={styles.summaryLabel}>场地费总计</span>
            </div>
          </div>
          
          <div className={styles.summaryCard}>
            <div className={styles.summaryIcon}>
              <CreditCard size={20} />
            </div>
            <div className={styles.summaryContent}>
              <span className={styles.summaryValue}>{financialData.totalVideoFees}</span>
              <span className={styles.summaryLabel}>视频费总计</span>
            </div>
          </div>
          
          <div className={styles.summaryCard}>
            <div className={styles.summaryIcon}>
              <Clock size={20} />
            </div>
            <div className={styles.summaryContent}>
              <span className={styles.summaryValue}>{financialData.totalLateFees}</span>
              <span className={styles.summaryLabel}>迟到罚款</span>
            </div>
          </div>
        </div>

        {/* Grand Total and Breakdown */}
        <div className={styles.totalBreakdown}>
          <div className={styles.baseCosts}>
            <h5>基础成本</h5>
            <div className={styles.costItem}>
              <span>场地费:</span>
              <span>{baseCosts.fieldFee}元</span>
            </div>
            <div className={styles.costItem}>
              <span>水费等杂费:</span>
              <span>{baseCosts.waterFee}元</span>
            </div>
            <div className={`${styles.costItem} ${styles.total}`}>
              <span>基础成本总计:</span>
              <span>{baseCosts.totalBaseCosts}元</span>
            </div>
          </div>

          <div className={styles.collectedFees}>
            <h5>收费总计</h5>
            <div className={`${styles.costItem} ${styles.grandTotal}`}>
              <span>收费总计:</span>
              <span>{financialData.grandTotal}元</span>
            </div>
            <div className={styles.costItem}>
              <span>人均费用:</span>
              <span>{financialData.averageFeePerPlayer}元</span>
            </div>
          </div>

          <div className={`${styles.difference} ${isDifferencePositive ? styles.positive : styles.negative}`}>
            <div className={styles.costItem}>
              <span>收支差额:</span>
              <span>{isDifferencePositive ? '+' : ''}{feeDifference}元</span>
            </div>
            {isDifferencePositive ? (
              <p className={styles.differenceNote}>
                <AlertCircle size={16} />
                收费超出成本 {feeDifference}元，可用于俱乐部基金
              </p>
            ) : feeDifference < 0 ? (
              <p className={styles.differenceNote}>
                <AlertCircle size={16} />
                收费不足 {Math.abs(feeDifference)}元，需要补贴
              </p>
            ) : (
              <p className={styles.differenceNote}>
                收支平衡
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Player Financial Details */}
      <div className={styles.playerSection}>
        <div className={styles.playerSectionHeader}>
          <h4>球员费用明细</h4>
          {hasUnsavedNotes && (
            <Button
              onClick={handleSaveNotes}
              disabled={saving}
              className="flex items-center gap-2"
              size="sm"
            >
              <Save size={16} />
              {saving ? '保存中...' : '保存备注'}
            </Button>
          )}
        </div>
        <div className={styles.playerList}>
          {financialData.playerFinancials.map(player => (
            <div key={player.userId} className={styles.playerFinancial}>
              <div className={styles.playerHeader}>
                <div className={styles.playerName}>
                  <User size={16} />
                  {player.userName}
                  {player.isLate && <span className={styles.lateIndicator}>迟到</span>}
                </div>
                <div className={styles.playerTotal}>
                  总计: {player.totalFeeCalculated}元
                </div>
              </div>
              
              <div className={styles.playerDetails}>
                <div className={styles.feeBreakdown}>
                  <div className={styles.feeItem}>
                    <span>参与时间: {player.totalTime}时段</span>
                    <span>场地费: {player.fieldFeeCalculated}元</span>
                  </div>
                  <div className={styles.feeItem}>
                    <span>视频费: {player.videoFee}元</span>
                    {player.lateFee > 0 && (
                      <span>迟到罚款: {player.lateFee}元</span>
                    )}
                  </div>
                </div>
                
                <div className={styles.paymentProxy}>
                  <label>代付备注:</label>
                  <Input
                    type="text"
                    placeholder="输入代付人姓名或备注"
                    value={player.paymentProxy || ''}
                    onChange={(e) => handlePaymentProxyChange(player.userId, e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}