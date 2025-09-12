/**
 * Centralized fee calculation utility for football club management system
 * 
 * This module provides consistent fee calculation logic across all parts of the application:
 * - Admin save API
 * - Admin display pages  
 * - Player view pages
 * 
 * Key principles:
 * - Goalkeepers are charged 0 yuan for time played as goalkeeper
 * - Goalkeepers are charged normal rates for time played as regular player
 * - Field fee is based on normal player time only
 * - Video fee follows Excel formula: ROUNDUP(totalTime/3*videoFeeRate, 0)
 * - Late fee uses configurable rate (default 10 yuan) if any late arrival
 */

export interface AttendanceData {
  attendance: {
    [section: string]: {
      [part: string]: number;
    };
  };
  goalkeeper: {
    [section: string]: {
      [part: string]: boolean;
    };
  };
}

export interface FeeCalculationResult {
  normalPlayerParts: number;
  sectionsWithNormalPlay: number;
  fieldFee: number;
  lateFee: number;
  videoFee: number;
  totalFee: number;
}

export interface FeeCalculationInput {
  attendanceData: AttendanceData;
  isLateArrival: boolean;
  feeCoefficient: number;
  lateFeeRate?: number;      // Optional, defaults to 10
  videoFeeRate?: number;     // Optional, defaults to 2
}

/**
 * Calculate fees for a player based on attendance and goalkeeper status
 * 
 * @param input - Player attendance data, late arrival status, and fee coefficient
 * @returns Detailed fee breakdown
 */
export function calculatePlayerFees(input: FeeCalculationInput): FeeCalculationResult {
  const { 
    attendanceData, 
    isLateArrival, 
    feeCoefficient,
    lateFeeRate = 10,      // Default fallback value
    videoFeeRate = 2       // Default fallback value
  } = input;
  
  // Count total parts played as normal player (not as goalkeeper)
  let normalPlayerParts = 0;
  const sectionsWithNormalPlay = new Set<number>();
  
  // Process each section (1-3) and part (1-3)
  for (let section = 1; section <= 3; section++) {
    let playedAsNormalInSection = false;
    
    for (let part = 1; part <= 3; part++) {
      const sectionStr = section.toString();
      const partStr = part.toString();
      
      const attendance = attendanceData.attendance[sectionStr]?.[partStr] || 0;
      const isGoalkeeper = attendanceData.goalkeeper[sectionStr]?.[partStr] || false;
      
      // Only count as normal player time if played AND not goalkeeper
      if (attendance > 0 && !isGoalkeeper) {
        normalPlayerParts += attendance;
        playedAsNormalInSection = true;
      }
    }
    
    // Track which sections had normal (non-GK) play for video fee
    if (playedAsNormalInSection) {
      sectionsWithNormalPlay.add(section);
    }
  }
  
  // Calculate individual fees with 2 decimal precision
  const fieldFee = Number((normalPlayerParts * feeCoefficient).toFixed(2));
  const lateFee = isLateArrival ? Number(lateFeeRate) : 0;
  // Video fee follows Excel formula: ROUNDUP(totalTime/3*videoFeeRate, 0)
  const videoFee = Number(Math.ceil(normalPlayerParts / 3 * Number(videoFeeRate)));
  const totalFee = Number((Number(fieldFee) + Number(lateFee) + Number(videoFee)).toFixed(2));
  
  return {
    normalPlayerParts,
    sectionsWithNormalPlay: sectionsWithNormalPlay.size,
    fieldFee,
    lateFee,
    videoFee,
    totalFee
  };
}

/**
 * Helper function to convert legacy participation data format to new AttendanceData format
 * Used for backward compatibility with existing data structures
 */
export function convertLegacyParticipationToAttendanceData(participation: Record<string, unknown>): AttendanceData {
  const attendanceData: AttendanceData = {
    attendance: {
      "1": { "1": 0, "2": 0, "3": 0 },
      "2": { "1": 0, "2": 0, "3": 0 },
      "3": { "1": 0, "2": 0, "3": 0 }
    },
    goalkeeper: {
      "1": { "1": false, "2": false, "3": false },
      "2": { "1": false, "2": false, "3": false },
      "3": { "1": false, "2": false, "3": false }
    }
  };

  // Convert from old format: section1Part1, section1Part2, etc.
  for (let section = 1; section <= 3; section++) {
    for (let part = 1; part <= 3; part++) {
      const fieldName = `section${section}Part${part}`;
      if (participation[fieldName] !== undefined) {
        attendanceData.attendance[section.toString()][part.toString()] = participation[fieldName];
      }
    }
  }
  
  // Handle goalkeeper status - if the old format has a single isGoalkeeper flag,
  // we need additional context to know which sections/parts were goalkeeper
  // This is a limitation of the legacy format
  if (participation.isGoalkeeper) {
    // For legacy data, we can't determine which specific parts were goalkeeper
    // This function should be used carefully with legacy data
    console.warn('Legacy participation data with isGoalkeeper flag detected. Cannot determine specific goalkeeper sections/parts.');
  }
  
  return attendanceData;
}

/**
 * Validate attendance data structure
 */
export function validateAttendanceData(attendanceData: unknown): attendanceData is AttendanceData {
  if (!attendanceData || typeof attendanceData !== 'object') {
    return false;
  }
  
  if (!attendanceData.attendance || !attendanceData.goalkeeper) {
    return false;
  }
  
  // Check structure for sections 1-3 and parts 1-3
  for (let section = 1; section <= 3; section++) {
    const sectionStr = section.toString();
    
    if (!attendanceData.attendance[sectionStr] || !attendanceData.goalkeeper[sectionStr]) {
      return false;
    }
    
    for (let part = 1; part <= 3; part++) {
      const partStr = part.toString();
      
      if (typeof attendanceData.attendance[sectionStr][partStr] !== 'number' ||
          typeof attendanceData.goalkeeper[sectionStr][partStr] !== 'boolean') {
        return false;
      }
    }
  }
  
  return true;
}