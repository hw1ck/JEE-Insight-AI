import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Sliders,
  CheckCircle2,
  CalendarCheck,
  RotateCcw,
  BarChart2,
  ShieldAlert,
  Award,
  Bot
} from 'lucide-react';
import { scoreSimulatorService, SimulatorInputs } from '../services/scoreSimulatorService';
import { studyPlannerService } from '../services/studyPlannerService';
import { mockTestService } from '../services/mockTestService';
import { ProgressBar } from '../components/common/ProgressBar';
import { NavPage } from '../components/layout/Sidebar';

interface ScoreSimulatorPageProps {
  onNavigate: (page: NavPage, topicContext?: string) => void;
}

export const ScoreSimulatorPage: React.FC<ScoreSimulatorPageProps> = ({ onNavigate }) => {
  const [baselineScore, setBaselineScore] = useState<number>(112);
  const [inputs, setInputs] = useState<SimulatorInputs>({
    mathAccuracyDelta: 20, // +20%
    chemAccuracyDelta: 10, // +10%
    physicsAccuracyDelta: 10, // +10%
    negativeMarksSaved: 4, // 4 guesses avoided
    extraWeeklyHours: 6, // 6 extra hours
    speedOptimizationSec: 20, // 20s faster in Physics
    customBaselineScore: 112
  });

  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);

  useEffect(() => {
    mockTestService.getLatestAttempt().then(att => {
      if (att) {
        setBaselineScore(att.score);
        setInputs(prev => ({ ...prev, customBaselineScore: att.score }));
      }
    });
  }, []);

  const simulation = useMemo(() => {
    return scoreSimulatorService.calculateScenario({
      ...inputs,
      customBaselineScore: baselineScore
    });
  }, [inputs, baselineScore]);

  const handleReset = () => {
    setInputs({
      mathAccuracyDelta: 0,
      chemAccuracyDelta: 0,
      physicsAccuracyDelta: 0,
      negativeMarksSaved: 0,
      extraWeeklyHours: 0,
      speedOptimizationSec: 0,
      customBaselineScore: baselineScore
    });
  };

  const handleApplyToPlan = async () => {
    if (inputs.mathAccuracyDelta > 0) {
      await studyPlannerService.addTask({
        day: 'Wed',
        subject: 'Mathematics',
        topic: 'Integration (Definite & Indefinite)',
        title: `Simulator Target: +${inputs.mathAccuracyDelta}% Calculus Accuracy Mastery Drill`,
        durationMinutes: 90,
        taskType: 'Timed Practice',
        priority: 'High',
        reason: 'Generated from Score Simulator assumptions.'
      });
    }

    if (inputs.chemAccuracyDelta > 0) {
      await studyPlannerService.addTask({
        day: 'Thu',
        subject: 'Chemistry',
        topic: 'Organic Reaction Mechanisms',
        title: `Simulator Target: +${inputs.chemAccuracyDelta}% Organic Chemistry Mechanism Review`,
        durationMinutes: 60,
        taskType: 'Concept Revision',
        priority: 'Medium',
        reason: 'Generated from Score Simulator chemistry target.'
      });
    }

    if (inputs.negativeMarksSaved > 0) {
      await studyPlannerService.addTask({
        day: 'Fri',
        subject: 'Mathematics',
        topic: 'Exam Strategy',
        title: `Eliminate ${inputs.negativeMarksSaved} blind guesses via timed mock triage discipline`,
        durationMinutes: 45,
        taskType: 'Mock Analysis',
        priority: 'High',
        reason: 'Enforce selective skipping discipline to eliminate negative penalties.'
      });
    }

    setAppliedMessage('Scenario objectives successfully transferred to your Study Planner!');
    setTimeout(() => setAppliedMessage(null), 3500);
  };

  return (
    <div className="page-container">
      {/* Title Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px'
        }}
      >
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Score Scenario Simulator
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Interactive what-if calculator evaluating the compound effect of accuracy gains and negative marking discipline.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="btn btn-secondary btn-sm"
          style={{ gap: '6px' }}
        >
          <RotateCcw size={14} />
          <span>Reset Inputs to Zero</span>
        </button>
      </div>

      {/* Mandatory Transparent Disclaimer Alert */}
      <div
        style={{
          backgroundColor: 'var(--warning-bg)',
          border: '1px solid var(--warning-border)',
          color: 'var(--warning)',
          padding: '12px 18px',
          borderRadius: '8px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '24px',
          lineHeight: 1.5
        }}
      >
        <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Illustrative Scenario Notice:</strong> Projected scores are deterministic mathematical calculations based on explicit assumptions (+5 raw marks per converted incorrect question, +1 raw mark per avoided negative guess). These are not machine learning predictions of future examination results. Real exam scores depend on candidate distribution and paper difficulty.
        </div>
      </div>

      {appliedMessage && (
        <div
          className="demo-banner"
          style={{
            backgroundColor: 'var(--success-bg)',
            borderColor: 'var(--success-border)',
            color: 'var(--success)',
            marginBottom: '16px'
          }}
        >
          {appliedMessage}
        </div>
      )}

      {/* Main Interactive Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '24px' }} className="simulator-grid">
        {/* Left Column: Sliders & Controls */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Sliders size={16} color="var(--accent-blue)" />
              <span>Hypothetical Improvement Parameters</span>
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Adjust sliders</span>
          </div>

          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Control 0: Baseline Score Selector */}
            <div style={{ paddingBottom: '14px', borderBottom: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>
                  Baseline Reference Score (/300):
                </label>
                <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                  {baselineScore}/300
                </strong>
              </div>
              <input
                type="range"
                min="60"
                max="220"
                step="5"
                value={baselineScore}
                onChange={e => setBaselineScore(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>60 marks</span>
                <span>Default baseline: 112 (Mock #8)</span>
                <span>220 marks</span>
              </div>
            </div>

            {/* Control 1: Mathematics Accuracy Delta */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>
                  Mathematics Accuracy Gain:
                </label>
                <strong style={{ color: 'var(--accent-blue)', fontSize: '14px' }}>
                  +{inputs.mathAccuracyDelta}%
                </strong>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="5"
                value={inputs.mathAccuracyDelta}
                onChange={e => setInputs({ ...inputs, mathAccuracyDelta: Number(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--accent-blue)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>Current: 51%</span>
                <span>Projected: {Math.min(100, 51 + inputs.mathAccuracyDelta)}%</span>
              </div>
            </div>

            {/* Control 2: Chemistry Organic Accuracy Delta */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>
                  Chemistry Accuracy Gain:
                </label>
                <strong style={{ color: 'var(--accent-teal)', fontSize: '14px' }}>
                  +{inputs.chemAccuracyDelta}%
                </strong>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="5"
                value={inputs.chemAccuracyDelta}
                onChange={e => setInputs({ ...inputs, chemAccuracyDelta: Number(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--accent-teal)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>Current: 68%</span>
                <span>Projected: {Math.min(100, 68 + inputs.chemAccuracyDelta)}%</span>
              </div>
            </div>

            {/* Control 3: Physics Accuracy Delta */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>
                  Physics Accuracy Gain:
                </label>
                <strong style={{ color: '#2563eb', fontSize: '14px' }}>
                  +{inputs.physicsAccuracyDelta}%
                </strong>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="5"
                value={inputs.physicsAccuracyDelta}
                onChange={e => setInputs({ ...inputs, physicsAccuracyDelta: Number(e.target.value) })}
                style={{ width: '100%', accentColor: '#2563eb' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>Current: 72%</span>
                <span>Projected: {Math.min(100, 72 + inputs.physicsAccuracyDelta)}%</span>
              </div>
            </div>

            {/* Control 4: Blind Guesses / Negative Marks Avoided */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>
                  Negative Marking Discipline (Omitted Guesses):
                </label>
                <strong style={{ color: 'var(--success)', fontSize: '14px' }}>
                  {inputs.negativeMarksSaved} questions skipped
                </strong>
              </div>
              <input
                type="range"
                min="0"
                max="8"
                step="1"
                value={inputs.negativeMarksSaved}
                onChange={e => setInputs({ ...inputs, negativeMarksSaved: Number(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--success)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>Eliminates blind negative penalty (-1 raw mark per guess)</span>
                <span>+{inputs.negativeMarksSaved} raw marks</span>
              </div>
            </div>

            {/* Control 5: Additional Weekly Practice Hours */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>
                  Additional Weekly Practice Time:
                </label>
                <strong style={{ color: '#b45309', fontSize: '14px' }}>
                  +{inputs.extraWeeklyHours} hours/week
                </strong>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                step="3"
                value={inputs.extraWeeklyHours}
                onChange={e => setInputs({ ...inputs, extraWeeklyHours: Number(e.target.value) })}
                style={{ width: '100%', accentColor: '#b45309' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>Reinforces problem pattern familiarity</span>
                <span>~{inputs.extraWeeklyHours * 15} additional problems</span>
              </div>
            </div>

            {/* Control 6: Speed Optimization in Physics */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>
                  Speed Optimization (Time Saved per Question):
                </label>
                <strong style={{ color: '#7c3aed', fontSize: '14px' }}>
                  {inputs.speedOptimizationSec}s saved / question
                </strong>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="10"
                value={inputs.speedOptimizationSec}
                onChange={e => setInputs({ ...inputs, speedOptimizationSec: Number(e.target.value) })}
                style={{ width: '100%', accentColor: '#7c3aed' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>Saves ~{Math.round((inputs.speedOptimizationSec * 25) / 60)} mins to reallocate to Mathematics calculations</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Estimated Result & Comparison Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Output Score Card */}
          <div
            className="card"
            style={{
              padding: '24px',
              backgroundColor: '#f8fafc',
              border: '1px solid var(--border-default)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Illustrative Estimated Score
            </div>

            <div style={{ fontSize: '52px', fontWeight: 800, color: 'var(--accent-primary)', lineHeight: 1.1, margin: '10px 0' }}>
              {simulation.estimatedScore}
              <span style={{ fontSize: '18px', fontWeight: 500, color: 'var(--text-muted)' }}> / 300</span>
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '999px', backgroundColor: 'var(--success-bg)', color: 'var(--success)', fontWeight: 700, fontSize: '13px', marginBottom: '12px' }}>
              <TrendingUp size={16} />
              +{simulation.scoreDelta} marks improvement
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Baseline: <strong>{simulation.baselineScore}/300</strong> • Illustrative Band: <strong>{simulation.estimatedRankBand}</strong>
            </div>

            {simulation.estimatedPercentile && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Projected Percentile: <strong>{simulation.estimatedPercentile}</strong>
              </div>
            )}

            {/* Before vs After Visual Bar */}
            <div style={{ marginTop: '20px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>Score Scale</span>
                <span>Target: 210/300</span>
              </div>
              <div style={{ height: '12px', backgroundColor: '#e2e8f0', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                <div style={{ width: `${(simulation.baselineScore / 300) * 100}%`, height: '100%', backgroundColor: '#94a3b8', position: 'absolute' }} />
                <div style={{ width: `${(simulation.estimatedScore / 300) * 100}%`, height: '100%', backgroundColor: 'var(--accent-blue)', opacity: 0.8 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>0</span>
                <span>Baseline ({simulation.baselineScore})</span>
                <span>Projected ({simulation.estimatedScore})</span>
                <span>300</span>
              </div>
            </div>

            {/* Apply to Study Plan CTA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
              <button
                onClick={handleApplyToPlan}
                className="btn btn-primary"
                style={{ width: '100%', gap: '8px', padding: '10px 16px' }}
              >
                <CalendarCheck size={16} />
                <span>Apply Assumptions to Study Plan</span>
              </button>
              <button
                onClick={() => onNavigate('ai-coach', `Score Scenario: +${simulation.scoreDelta} marks target`)}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', gap: '6px', padding: '8px 16px' }}
              >
                <Bot size={15} />
                <span>Discuss Scenario with AI Coach</span>
              </button>
            </div>
          </div>

          {/* Delta Contributions Breakdown */}
          <div className="card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
              Decomposition of Marks Gain (+{simulation.scoreDelta} Total)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Accuracy Gains (Math, Chem, Phys):</span>
                <strong style={{ color: 'var(--accent-blue)' }}>+{simulation.breakdown.fromAccuracy} marks</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Negative Marking Reduction:</span>
                <strong style={{ color: 'var(--success)' }}>+{simulation.breakdown.fromNegativeReduction} marks</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Extra Practice Retention:</span>
                <strong style={{ color: '#b45309' }}>+{simulation.breakdown.fromExtraPractice} marks</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Speed Reallocation to Difficult Steps:</span>
                <strong style={{ color: '#7c3aed' }}>+{simulation.breakdown.fromSpeedReallocation} marks</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Explanatory Scenario Assumptions Card */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <h3 className="card-title" style={{ marginBottom: '12px' }}>
          <AlertCircle size={16} color="var(--accent-blue)" />
          <span>How this scenario is calculated (Transparent Formula Assumptions)</span>
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {simulation.assumptions.map((ass, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <CheckCircle2 size={15} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{ass}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
