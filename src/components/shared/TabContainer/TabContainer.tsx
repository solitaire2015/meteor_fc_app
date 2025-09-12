'use client'

import { useState, ReactNode, useCallback, useEffect } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMatchStore } from '@/stores/useMatchStore'
import styles from './TabContainer.module.css'

interface TabDefinition {
  id: string
  label: string
  content: ReactNode
  disabled?: boolean
  badge?: string | number
  hasUnsavedChanges?: boolean
  isLoading?: boolean
  error?: string
}

interface TabContainerProps {
  tabs: TabDefinition[]
  defaultActiveTab?: string
  className?: string
  onTabChange?: (tabId: string, previousTabId: string) => void
  navigationGuard?: boolean
}

interface NavigationGuardDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

function NavigationGuardDialog({ isOpen, onConfirm, onCancel }: NavigationGuardDialogProps) {
  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <AlertTriangle className={styles.warningIcon} />
          <h3 className={styles.modalTitle}>未保存的更改</h3>
        </div>
        <div className={styles.modalBody}>
          <p>当前标签页有未保存的更改。如果离开此页面，更改将丢失。</p>
        </div>
        <div className={styles.modalActions}>
          <button 
            className={styles.cancelButton}
            onClick={onCancel}
          >
            取消
          </button>
          <button 
            className={styles.confirmButton}
            onClick={onConfirm}
          >
            离开页面
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TabContainer({ 
  tabs, 
  defaultActiveTab,
  className = '',
  onTabChange,
  navigationGuard = true
}: TabContainerProps) {
  const [activeTab, setActiveTab] = useState(defaultActiveTab || tabs[0]?.id || '')
  const [pendingTabChange, setPendingTabChange] = useState<string | null>(null)
  const [showNavigationGuard, setShowNavigationGuard] = useState(false)

  // Get unsaved changes state from store
  const isDirty = useMatchStore(state => state.isDirty)
  const isLoading = useMatchStore(state => state.isLoading)
  const errors = useMatchStore(state => state.errors)
  const hasUnsavedChanges = useMatchStore(state => state.hasUnsavedChanges)

  // Update tab data with store state
  const enhancedTabs = tabs.map(tab => ({
    ...tab,
    hasUnsavedChanges: tab.hasUnsavedChanges ?? isDirty[tab.id as keyof typeof isDirty] ?? false,
    isLoading: tab.isLoading ?? isLoading[tab.id as keyof typeof isLoading] ?? false,
    error: tab.error ?? errors[tab.id] ?? undefined,
  }))

  const activeTabData = enhancedTabs.find(tab => tab.id === activeTab)

  // Handle tab change with navigation guard
  const handleTabChange = useCallback((newTabId: string) => {
    if (newTabId === activeTab) return

    // Check if navigation guard should be shown
    if (navigationGuard && hasUnsavedChanges()) {
      setPendingTabChange(newTabId)
      setShowNavigationGuard(true)
      return
    }

    // Direct tab change
    const previousTab = activeTab
    setActiveTab(newTabId)
    onTabChange?.(newTabId, previousTab)
  }, [activeTab, navigationGuard, hasUnsavedChanges, onTabChange])

  // Confirm navigation guard
  const confirmNavigation = useCallback(() => {
    if (pendingTabChange) {
      const previousTab = activeTab
      setActiveTab(pendingTabChange)
      onTabChange?.(pendingTabChange, previousTab)
    }
    setShowNavigationGuard(false)
    setPendingTabChange(null)
  }, [activeTab, pendingTabChange, onTabChange])

  // Cancel navigation guard
  const cancelNavigation = useCallback(() => {
    setShowNavigationGuard(false)
    setPendingTabChange(null)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + S to save current tab
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        
        const currentTab = enhancedTabs.find(tab => tab.id === activeTab)
        if (currentTab?.hasUnsavedChanges) {
          // Trigger save action based on tab
          toast.promise(
            new Promise((resolve, reject) => {
              // This would be implemented based on the specific tab
              setTimeout(() => {
                if (Math.random() > 0.1) { // Simulate success
                  resolve(undefined)
                } else {
                  reject(new Error('保存失败'))
                }
              }, 1000)
            }),
            {
              loading: '保存中...',
              success: '保存成功',
              error: '保存失败',
            }
          )
        }
      }

      // Tab navigation with Arrow keys
      if (event.altKey) {
        const currentIndex = enhancedTabs.findIndex(tab => tab.id === activeTab)
        
        if (event.key === 'ArrowLeft' && currentIndex > 0) {
          event.preventDefault()
          handleTabChange(enhancedTabs[currentIndex - 1].id)
        } else if (event.key === 'ArrowRight' && currentIndex < enhancedTabs.length - 1) {
          event.preventDefault()
          handleTabChange(enhancedTabs[currentIndex + 1].id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, enhancedTabs, handleTabChange])

  return (
    <>
      <div className={`${styles.container} ${className}`}>
        <div className={styles.tabHeader}>
          {enhancedTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              disabled={tab.disabled || isLoading.saving}
              className={`${styles.tab} ${
                activeTab === tab.id ? styles.active : ''
              } ${tab.hasUnsavedChanges ? styles.hasChanges : ''} ${
                tab.disabled ? styles.disabled : ''
              } ${tab.error ? styles.hasError : ''}`}
              title={tab.error ? `错误: ${tab.error}` : undefined}
            >
              <span className={styles.tabLabel}>
                {tab.label}
                {tab.badge && (
                  <span className={styles.badge}>{tab.badge}</span>
                )}
              </span>
              
              {tab.isLoading && <Loader2 className={styles.loadingIcon} />}
              {tab.hasUnsavedChanges && !tab.isLoading && (
                <span className={styles.changeIndicator}>•</span>
              )}
              {tab.error && !tab.isLoading && (
                <AlertTriangle className={styles.errorIcon} />
              )}
            </button>
          ))}
        </div>
        
        <div className={styles.tabContent}>
          {activeTabData?.content}
        </div>

        {/* Global saving indicator */}
        {isLoading.saving && (
          <div className={styles.savingIndicator}>
            <Loader2 className={styles.savingIcon} />
            <span>保存中...</span>
          </div>
        )}
      </div>

      {/* Navigation Guard Dialog */}
      <NavigationGuardDialog
        isOpen={showNavigationGuard}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />
    </>
  )
}