'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Calculator, Users, Clock } from 'lucide-react'
import FinancialCalculator from '@/components/shared/FinancialCalculator'
import { Match, User, AttendanceData, FinancialData } from '@/types'
import styles from './FinancialTab.module.css'

interface FinancialTabProps {
  match: Match
  users: User[]
  attendance: AttendanceData[]
  onFinancialUpdate: (financialData: FinancialData) => void
}

export default function FinancialTab({ 
  match, 
  users, 
  attendance, 
  onFinancialUpdate 
}: FinancialTabProps) {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null)

  const handleFinancialUpdate = (data: FinancialData) => {
    setFinancialData(data)
    onFinancialUpdate(data)
  }

  // Calculate basic stats from attendance
  const stats = {
    totalParticipants: new Set(attendance.filter(a => a.value > 0).map(a => a.userId)).size,
    totalPlayingTime: attendance.reduce((sum, a) => sum + a.value, 0),
    totalFieldCost: Number(match.fieldFeeTotal) + Number(match.waterFeeTotal),
    baseCostPerPerson: Number(match.feeCoefficient)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>费用计算</h3>
        <p className={styles.subtitle}>基于出勤数据自动计算各项费用</p>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <DollarSign size={24} />
          </div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryValue}>¥{stats.totalFieldCost}</div>
            <div className={styles.summaryLabel}>基础场地费用</div>
            <div className={styles.summaryDetail}>
              场地 ¥{Number(match.fieldFeeTotal)} + 杂费 ¥{Number(match.waterFeeTotal)}
            </div>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <Users size={24} />
          </div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryValue}>{stats.totalParticipants}</div>
            <div className={styles.summaryLabel}>参与人数</div>
            <div className={styles.summaryDetail}>
              基础费用系数: ¥{Number(match.feeCoefficient)}/时段
            </div>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <Clock size={24} />
          </div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryValue}>{stats.totalPlayingTime}</div>
            <div className={styles.summaryLabel}>总出勤时长</div>
            <div className={styles.summaryDetail}>
              所有球员累计时段数
            </div>
          </div>
        </div>

        {financialData && (
          <div className={styles.summaryCard}>
            <div className={styles.summaryIcon}>
              <Calculator size={24} />
            </div>
            <div className={styles.summaryContent}>
              <div className={styles.summaryValue}>¥{financialData.grandTotal}</div>
              <div className={styles.summaryLabel}>计算总费用</div>
              <div className={styles.summaryDetail}>
                平均 ¥{financialData.averageFeePerPlayer}/人
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.calculatorSection}>
        <FinancialCalculator
          match={match}
          attendance={attendance}
          users={users}
          onFinancialUpdate={handleFinancialUpdate}
        />
      </div>

      {financialData && (
        <div className={styles.breakdown}>
          <h4>费用明细</h4>
          <div className={styles.breakdownGrid}>
            <div className={styles.breakdownItem}>
              <span className={styles.breakdownLabel}>基础场地费用:</span>
              <span className={styles.breakdownValue}>¥{stats.totalFieldCost}</span>
            </div>
            <div className={styles.breakdownItem}>
              <span className={styles.breakdownLabel}>参与者费用:</span>
              <span className={styles.breakdownValue}>¥{(financialData.totalParticipants * Number(match.feeCoefficient))}</span>
            </div>
            <div className={styles.breakdownItem}>
              <span className={styles.breakdownLabel}>视频费用:</span>
              <span className={styles.breakdownValue}>¥{financialData.totalVideoFees}</span>
            </div>
            <div className={styles.breakdownItem}>
              <span className={styles.breakdownLabel}>迟到罚款:</span>
              <span className={styles.breakdownValue}>¥{financialData.totalLateFees}</span>
            </div>
            <div className={`${styles.breakdownItem} ${styles.total}`}>
              <span className={styles.breakdownLabel}>总计:</span>
              <span className={styles.breakdownValue}>¥{financialData.grandTotal}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}