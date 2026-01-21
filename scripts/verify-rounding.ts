import { calculatePlayerFees, type AttendanceData } from '../src/lib/feeCalculation';

// Mock attendance data
const mockAttendance: AttendanceData = {
    attendance: {
        "1": { "1": 1, "2": 1, "3": 1 },
        "2": { "1": 0, "2": 0, "3": 0 },
        "3": { "1": 0, "2": 0, "3": 0 }
    },
    goalkeeper: {
        "1": { "1": false, "2": false, "3": false },
        "2": { "1": false, "2": false, "3": false },
        "3": { "1": false, "2": false, "3": false }
    }
};

const testCases = [
    { feeCoefficient: 5.1333, expectedFieldFee: 15 }, // 3 * 5.1333 = 15.3999 -> 15
    { feeCoefficient: 5.1667, expectedFieldFee: 16 }, // 3 * 5.1667 = 15.5001 -> 16
    { feeCoefficient: 5.15, expectedFieldFee: 15 },    // 3 * 5.15 = 15.45 -> 15
    { videoFeeRate: 2, expectedVideoFee: 2 },        // 3 / 3 * 2 = 2
    { videoFeeRate: 2.5, expectedVideoFee: 3 },      // 3 / 3 * 2.5 = 2.5 -> 3
    { videoFeeRate: 2.4, expectedVideoFee: 2 },      // 3 / 3 * 2.4 = 2.4 -> 2
];

console.log("Running Rounding Logic Tests...");

testCases.forEach((tc, i) => {
    const result = calculatePlayerFees({
        attendanceData: mockAttendance,
        isLateArrival: false,
        feeCoefficient: tc.feeCoefficient || 5,
        videoFeeRate: tc.videoFeeRate || 2,
        lateFeeRate: 10
    });

    if (tc.expectedFieldFee !== undefined) {
        console.log(`Test ${i + 1} (Field Fee): Result ${result.fieldFee}, Expected ${tc.expectedFieldFee} - ${result.fieldFee === tc.expectedFieldFee ? "PASS" : "FAIL"}`);
    }
    if (tc.expectedVideoFee !== undefined) {
        console.log(`Test ${i + 1} (Video Fee): Result ${result.videoFee}, Expected ${tc.expectedVideoFee} - ${result.videoFee === tc.expectedVideoFee ? "PASS" : "FAIL"}`);
    }
});
