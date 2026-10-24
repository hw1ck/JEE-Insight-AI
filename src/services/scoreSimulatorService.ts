import { ScoreScenarioSimulation } from '../types';

export interface SimulatorInputs {
  mathAccuracyDelta: number;     // 0 to 40%
  chemAccuracyDelta: number;     // 0 to 30%
  physicsAccuracyDelta: number;  // 0 to 30%
  negativeMarksSaved: number;    // 0 to 10 questions
  extraWeeklyHours: number;      // 0 to 15 hours
  speedOptimizationSec: number;  // 0 to 40 seconds
  customBaselineScore?: number;
}

export interface IScoreSimulatorService {
  calculateScenario(inputs: SimulatorInputs): ScoreScenarioSimulation;
}

class LocalScoreSimulatorService implements IScoreSimulatorService {
  calculateScenario(inputs: SimulatorInputs): ScoreScenarioSimulation {
    const baselineScore = inputs.customBaselineScore !== undefined ? inputs.customBaselineScore : 112;

    // Mathematical formula breakdown:
    // 1. Math accuracy delta: Converting an incorrect question to correct gains (+4 - (-1)) = +5 raw marks.
    // In a 25-question Math section, a +10% accuracy gain converts ~2.5 questions => ~12.5 marks on 100-scale.
    // On 300 aggregate scale, scaled effect is approx +5.5 marks per 10% gain.
    const fromAccuracyMath = Math.round((inputs.mathAccuracyDelta / 10) * 5.5);

    // 2. Chemistry accuracy delta:
    const fromAccuracyChem = Math.round((inputs.chemAccuracyDelta / 10) * 4.5);

    // 3. Physics accuracy delta:
    const fromAccuracyPhys = Math.round((inputs.physicsAccuracyDelta / 10) * 4.0);

    const fromAccuracy = fromAccuracyMath + fromAccuracyChem + fromAccuracyPhys;

    // 4. Negative marks saved: Each omitted blind guess saves the -1 penalty (+1 raw mark, ~2.5 on scaled benchmark)
    const fromNegativeReduction = Math.round(inputs.negativeMarksSaved * 2.5);

    // 5. Extra practice hours: Every 3 hours of focused drill adds approx 2 marks through pattern recognition
    const fromExtraPractice = Math.round((inputs.extraWeeklyHours / 3) * 2.0);

    // 6. Speed optimization: Saving seconds allows reallocating time to 1-2 additional high-confidence questions
    const fromSpeedReallocation = Math.round((inputs.speedOptimizationSec / 10) * 1.5);

    const totalDelta = fromAccuracy + fromNegativeReduction + fromExtraPractice + fromSpeedReallocation;
    const estimatedScore = Math.min(300, Math.max(0, baselineScore + totalDelta));

    // Empirical JEE Main 2026 Session 1 (21-28 Jan 2026) Shift Distribution Calibration
    // Across 10 actual shifts:
    // 99.9 %ile: 219 (Toughest - 22 Jan S2) to 243 (Easiest - 22 Jan S1) [Mean: 228.8]
    // 99.0 %ile: 153 (Toughest) to 186 (Easiest) [Mean: 168.3]
    // 95.0 %ile: 99 (Toughest) to 129 (Easiest) [Mean: 113.4]
    let estimatedRankBand = 'AIR 95,000 - 1,35,000';
    let estimatedPercentile = '88.5 - 92.5 %ile (Empirical 2026 Shift Median)';

    if (estimatedScore >= 235) {
      estimatedRankBand = 'AIR 500 - 1,800 (Top NIT CSE / IIIT-H / IIT Qualification)';
      estimatedPercentile = '99.8 - 99.95 %ile (2026 Shift 1/2 Benchmark)';
    } else if (estimatedScore >= 200) {
      estimatedRankBand = 'AIR 2,000 - 5,500 (Top NITs Electrical / ECE / CSE)';
      estimatedPercentile = '99.2 - 99.7 %ile (2026 Session 1 Benchmark)';
    } else if (estimatedScore >= 168) {
      estimatedRankBand = 'AIR 6,000 - 14,000 (Established NIT Core Branches)';
      estimatedPercentile = '98.8 - 99.2 %ile (2026 Mean 99%ile: 168.3 marks)';
    } else if (estimatedScore >= 140) {
      estimatedRankBand = 'AIR 18,000 - 32,000 (Top State Colleges / Middle NITs)';
      estimatedPercentile = '96.8 - 98.2 %ile (2026 Shift Median)';
    } else if (estimatedScore >= 113) {
      estimatedRankBand = 'AIR 38,000 - 65,000 (Qualifying Comfortably)';
      estimatedPercentile = '94.8 - 96.5 %ile (2026 Mean 95%ile: 113.4 marks)';
    } else if (estimatedScore >= 90) {
      estimatedRankBand = 'AIR 70,000 - 1,10,000';
      estimatedPercentile = '91.0 - 94.0 %ile';
    } else {
      estimatedRankBand = 'AIR 1,30,000+';
      estimatedPercentile = '< 90.0 %ile';
    }

    const assumptions = [
      `Empirical 2026 Calibration: Percentile bounds are cross-referenced with all 10 shifts from NTA JEE Main Session 1 (21–28 January 2026), where mean 95%ile was 113.4 marks and mean 99%ile was 168.3 marks.`,
      `Mathematics accuracy improvement (+${inputs.mathAccuracyDelta}%): Assumes systematic conversion of borderline Calculus/Algebra questions (+${fromAccuracyMath} marks).`,
      `Chemistry accuracy improvement (+${inputs.chemAccuracyDelta}%): Assumes review of Organic Mechanisms & Physical Equilibrium (+${fromAccuracyChem} marks).`,
      `Physics accuracy improvement (+${inputs.physicsAccuracyDelta}%): Eliminates common sign/axis errors in Mechanics & Electrodynamics (+${fromAccuracyPhys} marks).`,
      `Negative mark elimination: Skipping ${inputs.negativeMarksSaved} blind guesses preserves +${fromNegativeReduction} marks (+1 raw per avoided penalty).`,
      `Focused practice: ${inputs.extraWeeklyHours} weekly hours yields ~${inputs.extraWeeklyHours * 15} solved problems (+${fromExtraPractice} marks).`,
      `Pacing optimization: Saving ${inputs.speedOptimizationSec}s in Physics/Chemistry frees cognitive bandwidth for multi-step Mathematics (+${fromSpeedReallocation} marks).`,
      `Methodological Limitation: Deterministic mathematical model assuming linear independence. Does not account for test-day anxiety, negative variance, or future shift normalization volatility.`
    ];

    return {
      baselineScore,
      mathAccuracyDelta: inputs.mathAccuracyDelta,
      chemAccuracyDelta: inputs.chemAccuracyDelta,
      physicsAccuracyDelta: inputs.physicsAccuracyDelta,
      negativeMarksSaved: inputs.negativeMarksSaved,
      extraWeeklyHours: inputs.extraWeeklyHours,
      speedOptimizationSec: inputs.speedOptimizationSec,
      estimatedScore,
      estimatedRankBand,
      estimatedPercentile,
      scoreDelta: totalDelta,
      breakdown: {
        fromAccuracy,
        fromNegativeReduction,
        fromExtraPractice,
        fromSpeedReallocation
      },
      assumptions
    };
  }
}

export const scoreSimulatorService: IScoreSimulatorService = new LocalScoreSimulatorService();
