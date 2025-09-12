/**
 * Utility functions for calculating match coefficient
 */

/**
 * Calculate fee coefficient based on field fee, water fee, and fixed total time units
 * Formula: (fieldFeeTotal + waterFeeTotal) / FIXED_TOTAL_TIME_UNITS
 * 
 * Fixed total time units = 90 (represents the standard total time units for coefficient calculation)
 * This matches the Excel formula where coefficient is calculated using a fixed denominator
 * 
 * @param fieldFeeTotal - Total field fee
 * @param waterFeeTotal - Total water fee
 * @param actualPlayTime - Actual total play time in time units (not used in calculation, kept for backward compatibility)
 * @returns Calculated coefficient
 */
export const calculateCoefficient = (
  fieldFeeTotal: number, 
  waterFeeTotal: number, 
  actualPlayTime: number
): number => {
  // Handle edge cases
  if (fieldFeeTotal < 0 || waterFeeTotal < 0) return 0
  
  // Use fixed 90 time units for coefficient calculation (matches Excel formula)
  const FIXED_TOTAL_TIME_UNITS = 90
  return (fieldFeeTotal + waterFeeTotal) / FIXED_TOTAL_TIME_UNITS
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