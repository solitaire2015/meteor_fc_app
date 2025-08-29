'use client'

import { useState, useEffect, useMemo } from 'react'
import { DollarSign, Calculator, Users, Clock, CreditCard, User, AlertCircle } from 'lucide-react'
import { User as UserType, AttendanceData, Match, FinancialData, PlayerFinancialData } from '@/types'
import styles from './FinancialCalculator.module.css'

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

  // Calculate financial data
  const financialData = useMemo((): FinancialData => {
    // Get unique participating users
    const participatingUsers = new Set(attendance.filter(a => a.value > 0).map(a => a.userId))
    
    const playerFinancials: PlayerFinancialData[] = Array.from(participatingUsers).map(userId => {
      const user = users.find(u => u.id === userId)
      const userAttendances = attendance.filter(a => a.userId === userId && a.value > 0)
      
      // Calculate total time from all attendance records
      const totalTime = userAttendances.reduce((sum, a) => sum + a.value, 0)
      
      // Check if user is late (any attendance record marked as late)
      const isLate = userAttendances.some(a => a.isLateArrival)
      
      // Calculate field fee based on total time and coefficient
      const fieldFeeCalculated = Math.round(totalTime * Number(match.feeCoefficient))
      
      // Late fee: Constant 10 yuan
      const lateFee = isLate ? lateFeeAmount : 0
      
      // Video fee calculation: ROUNDUP(parts_played/3*2, 0)
      const videoFee = Math.ceil((totalTime / 3) * 2)
      
      // Total calculated fee
      const totalFeeCalculated = fieldFeeCalculated + lateFee + videoFee
      
      return {
        userId,
        userName: user?.name || '未知用户',
        totalTime,
        fieldFeeCalculated,
        lateFee,
        videoFee,
        totalFeeCalculated,
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
              <input
                type="number"
                min="0"
                value={lateFeeAmount}
                onChange={(e) => setLateFeeAmount(parseInt(e.target.value) || 0)}
                className={styles.numberInput}
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
        <h4>球员费用明细</h4>
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
                  <input
                    type="text"
                    placeholder="输入代付人姓名或备注"
                    value={player.paymentProxy || ''}
                    onChange={(e) => handlePaymentProxyChange(player.userId, e.target.value)}
                    className={styles.proxyInput}
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