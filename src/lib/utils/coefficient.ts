/**
 * Utility functions for calculating match coefficient
 */

/**
 * Calculate fee coefficient based on field fee, water fee, and match length.
 *
 * Why this denominator?
 * - Each section is 30 minutes (3 parts × 10 minutes).
 * - A match has 11 players on the field, but goalkeeper time is treated as 0 for field/video fees,
 *   so we distribute fees over the 10 non-goalkeeper player-slots.
 *
 * Therefore total fee-bearing time units per match = (sectionCount × 30).
 *
 * Formula: (fieldFeeTotal + waterFeeTotal) / (sectionCount × 30)
 */
export const calculateCoefficient = (
  fieldFeeTotal: number,
  waterFeeTotal: number,
  sectionCount: number = 3
): number => {
  if (fieldFeeTotal < 0 || waterFeeTotal < 0) return 0

  const denom = Math.max(1, Number(sectionCount) || 3) * 30
  return (fieldFeeTotal + waterFeeTotal) / denom
}

/**
 * Validate fee values to ensure they are not negative
 * @param fieldFee - Field fee value
 * @param waterFee - Water fee value
 * @returns Validation result with error message if invalid
 */
export const validateFees = (fieldFee: number, waterFee: number) => {
  if (fieldFee < 0) {
    return { isValid: false, error: 'Field fee cannot be negative' }
  }
  if (waterFee < 0) {
    return { isValid: false, error: 'Water fee cannot be negative' }
  }
  return { isValid: true, error: null }
}

/**
 * Format coefficient for display with proper decimal places
 * @param coefficient - Raw coefficient value
 * @returns Formatted coefficient string
 */
export const formatCoefficient = (coefficient: number): string => {
  return coefficient.toFixed(2)
}