'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import styles from './YearSelector.module.css'

interface YearSelectorProps {
  value: number
  onChange: (year: number) => void
  minYear?: number
  maxYear?: number
  className?: string
}

export default function YearSelector({ 
  value, 
  onChange, 
  minYear,
  maxYear,
  className = ''
}: YearSelectorProps) {
  const currentYear = new Date().getFullYear()
  
  // Set default boundaries if not provided
  const min = minYear || currentYear - 5  // Default: 5 years back
  const max = maxYear || currentYear       // Default: current year
  
  const handleDecrease = () => {
    if (value > min) {
      onChange(value - 1)
    }
  }
  
  const handleIncrease = () => {
    if (value < max) {
      onChange(value + 1)
    }
  }
  
  return (
    <div className={`${styles.yearSelector} ${className}`}>
      <button 
        type="button"
        className={`${styles.arrowButton} ${value <= min ? styles.disabled : ''}`}
        onClick={handleDecrease}
        disabled={value <= min}
        aria-label="Previous year"
      >
        <ChevronLeft size={20} />
      </button>
      
      <span className={styles.yearLabel}>
        {value}年
      </span>
      
      <button 
        type="button"
        className={`${styles.arrowButton} ${value >= max ? styles.disabled : ''}`}
        onClick={handleIncrease}
        disabled={value >= max}
        aria-label="Next year"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  )
}