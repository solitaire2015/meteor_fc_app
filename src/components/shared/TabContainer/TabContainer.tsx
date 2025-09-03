'use client'

import { useState, ReactNode } from 'react'
import styles from './TabContainer.module.css'

interface Tab {
  id: string
  label: string
  content: ReactNode
  hasUnsavedChanges?: boolean
}

interface TabContainerProps {
  tabs: Tab[]
  defaultActiveTab?: string
  className?: string
}

export default function TabContainer({ 
  tabs, 
  defaultActiveTab,
  className = '' 
}: TabContainerProps) {
  const [activeTab, setActiveTab] = useState(defaultActiveTab || tabs[0]?.id || '')

  const activeTabData = tabs.find(tab => tab.id === activeTab)

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.tabHeader}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${styles.tab} ${
              activeTab === tab.id ? styles.active : ''
            } ${tab.hasUnsavedChanges ? styles.hasChanges : ''}`}
          >
            {tab.label}
            {tab.hasUnsavedChanges && <span className={styles.changeIndicator}>•</span>}
          </button>
        ))}
      </div>
      
      <div className={styles.tabContent}>
        {activeTabData?.content}
      </div>
    </div>
  )
}