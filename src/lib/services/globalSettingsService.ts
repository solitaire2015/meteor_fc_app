import { prisma } from '@/lib/prisma'

export interface SystemConfigRecord {
  key: string
  value: string
  description: string | null
  updatedAt: Date
  updatedBy: string
}

// Default values for critical settings
const DEFAULT_VALUES = {
  VIDEO_FEE_RATE: "2",
  LATE_FEE_RATE: "10"
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

    // Check with new key format, then try old key format for backward compatibility
    let cachedValue = this.cache.get(key)

    // Mapping for backward compatibility
    if (cachedValue === undefined) {
      if (key === 'base_video_fee_rate') cachedValue = this.cache.get('VIDEO_FEE_RATE')
      if (key === 'base_late_fee_rate') cachedValue = this.cache.get('LATE_FEE_RATE')
    }

    if (cachedValue !== undefined) {
      return cachedValue
    }

    // Fallback to default values for critical settings
    if (key === 'VIDEO_FEE_RATE' || key === 'base_video_fee_rate') return DEFAULT_VALUES.VIDEO_FEE_RATE
    if (key === 'LATE_FEE_RATE' || key === 'base_late_fee_rate') return DEFAULT_VALUES.LATE_FEE_RATE

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
      this.getSettingAsNumber('VIDEO_FEE_RATE'),
      this.getSettingAsNumber('LATE_FEE_RATE')
    ])

    return {
      baseVideoFeeRate,
      baseLateFeeRate
    }
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
      const settings = await prisma.systemConfig.findMany()

      // Update cache
      this.cache.clear()
      for (const setting of settings) {
        this.cache.set(setting.key, setting.value)
      }

      this.lastCacheUpdate = now
    } catch (error) {
      console.error('Failed to refresh system config cache:', error)
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