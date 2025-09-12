/**
 * Global Settings Service
 * 
 * Manages global application settings stored in the database.
 * Provides cached access with fallback to default values.
 */

import { prisma } from '@/lib/prisma'

export interface GlobalSettingRecord {
  id: string
  key: string
  value: string
  dataType: string
  description: string | null
  category: string
  updatedAt: Date
}

// Default values for critical settings
const DEFAULT_VALUES = {
  base_video_fee_rate: "2",
  base_late_fee_rate: "10"
} as const

export class GlobalSettingsService {
  private cache = new Map<string, string>()
  private lastCacheUpdate: Date | null = null
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Get a setting value with automatic type conversion and fallback
   */
  async getSetting(key: string): Promise<string> {
    await this.refreshCacheIfNeeded()
    
    const cachedValue = this.cache.get(key)
    if (cachedValue !== undefined) {
      return cachedValue
    }

    // Fallback to default values for critical settings
    if (key in DEFAULT_VALUES) {
      return DEFAULT_VALUES[key as keyof typeof DEFAULT_VALUES]
    }

    throw new Error(`Global setting '${key}' not found and no default value available`)
  }

  /**
   * Get setting as number with fallback
   */
  async getSettingAsNumber(key: string): Promise<number> {
    const value = await this.getSetting(key)
    const numValue = Number(value)
    
    if (isNaN(numValue)) {
      throw new Error(`Global setting '${key}' value '${value}' is not a valid number`)
    }
    
    return numValue
  }

  /**
   * Get multiple settings at once
   */
  async getSettings(keys: string[]): Promise<Record<string, string>> {
    await this.refreshCacheIfNeeded()
    
    const result: Record<string, string> = {}
    
    for (const key of keys) {
      try {
        result[key] = await this.getSetting(key)
      } catch (error) {
        console.warn(`Failed to get setting '${key}':`, error)
      }
    }
    
    return result
  }

  /**
   * Get base fee rates for match creation
   */
  async getBaseFeeRates(): Promise<{
    baseVideoFeeRate: number
    baseLateFeeRate: number
  }> {
    const [baseVideoFeeRate, baseLateFeeRate] = await Promise.all([
      this.getSettingAsNumber('base_video_fee_rate'),
      this.getSettingAsNumber('base_late_fee_rate')
    ])

    return {
      baseVideoFeeRate,
      baseLateFeeRate
    }
  }

  /**
   * Initialize default settings in database
   */
  async initializeDefaultSettings(): Promise<void> {
    const defaultSettings = [
      {
        key: 'base_video_fee_rate',
        value: '2',
        dataType: 'decimal',
        description: 'Base video fee rate per unit for new matches',
        category: 'fees'
      },
      {
        key: 'base_late_fee_rate',
        value: '10',
        dataType: 'decimal',
        description: 'Base late arrival fee rate for new matches',
        category: 'fees'
      }
    ]

    for (const setting of defaultSettings) {
      await prisma.globalSetting.upsert({
        where: { key: setting.key },
        update: {
          // Don't overwrite existing values, only update metadata
          dataType: setting.dataType,
          description: setting.description,
          category: setting.category
        },
        create: setting
      })
    }

    // Clear cache to force reload
    this.cache.clear()
    this.lastCacheUpdate = null
  }

  /**
   * Refresh cache from database if needed
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    const now = new Date()
    
    if (this.lastCacheUpdate && 
        (now.getTime() - this.lastCacheUpdate.getTime()) < this.CACHE_TTL) {
      return // Cache is still valid
    }

    try {
      const settings = await prisma.globalSetting.findMany()
      
      // Update cache
      this.cache.clear()
      for (const setting of settings) {
        this.cache.set(setting.key, setting.value)
      }
      
      this.lastCacheUpdate = now
    } catch (error) {
      console.error('Failed to refresh global settings cache:', error)
      // Continue with existing cache or defaults
    }
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear()
    this.lastCacheUpdate = null
  }
}

// Export singleton instance
export const globalSettingsService = new GlobalSettingsService()