import React, { useState, useEffect } from 'react';
import {
  Play,
  Clock,
  HelpCircle,
  Filter,
  CheckCircle2,
  AlertCircle,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  BarChart,
  BookOpen,
  Send,
  Search,
  ArrowUpDown,
  FileCheck2,
  ShieldAlert,
  Award
} from 'lucide-react';
import { MockTestSummary, Question, QuestionResponse, Difficulty, TestType, Subject } from '../types';
import { mockTestService } from '../services/mockTestService';
import { apiClient } from '../services/apiClient';
import { Modal } from '../components/common/Modal';
import { MathRenderer } from '../components/common/MathRenderer';
import { NavPage } from '../components/layout/Sidebar';

interface MockTestsPageProps {
  onNavigate: (page: NavPage) => void;
  onTestSubmitted?: (attemptId: string) => void;
  onTestActiveChange?: (isActive: boolean) => void;
}

export const MockTestsPage: React.FC<MockTestsPageProps> = ({
  onNavigate,
  onTestSubmitted,
  onTestActiveChange
}) => {
  const [tests, setTests] = useState<MockTestSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'default' | 'title' | 'duration' | 'questions'>('default');

  // Pre-Start Confirmation Modal
  const [pendingTestToStart, setPendingTestToStart] = useState<MockTestSummary | null>(null);
  const [hasExistingDraft, setHasExistingDraft] = useState<boolean>(false);

  // Active Test State
  const [activeTest, setActiveTest] = useState<MockTestSummary | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [responses, setResponses] = useState<Record<string, QuestionResponse>>({});
  const [timerSeconds, setTimerSeconds] = useState<number>(1800);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [visitedQuestions, setVisitedQuestions] = useState<Set<number>>(new Set([0]));
  const [activeSectionFilter, setActiveSectionFilter] = useState<'All' | Subject>('All');
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Behavioral Telemetry Tracking
  const [telemetry, setTelemetry] = useState<Record<string, {
    visitCount: number;
    timeSpentSeconds: number;
    timeToFirstActionSeconds: number | null;
    answerChangeCount: number;
    reviewToggleCount: number;
    initialOption: string | null;
    finalOption: string | null;
    telemetryEvents: Array<{ type: string; timestamp: number; details?: any }>;
  }>>({});
  const [questionEntryTime, setQuestionEntryTime] = useState<number>(Date.now());

  useEffect(() => {
    mockTestService.getAllTests().then(data => setTests(data));
  }, []);

  // Timer countdown & Auto-save draft
  useEffect(() => {
    if (!activeTest || !isTimerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTest, isTimerRunning]);

  // Periodic draft persistence
  useEffect(() => {
    if (!activeTest) return;
    mockTestService.saveDraft(activeTest.id, responses, timerSeconds, currentIndex);
  }, [activeTest, responses, timerSeconds, currentIndex]);

  const handleOpenStartModal = (test: MockTestSummary) => {
    const draft = mockTestService.getDraft(test.id);
    setHasExistingDraft(draft !== null);
    setPendingTestToStart(test);
  };

  const handleConfirmStart = async (resumeDraft: boolean = false) => {
    if (!pendingTestToStart) return;
    const test = pendingTestToStart;
    const qs = await mockTestService.getTestQuestions(test.id);
    setQuestions(qs);
    setActiveTest(test);
    onTestActiveChange?.(true);
    setActiveSectionFilter('All');

    const draft = mockTestService.getDraft(test.id);
    if (resumeDraft && draft) {
      let restoredResponses = draft.responses;
      let restoredTimer = draft.timerSeconds;

      // Authoritative CBT State Recovery from Server
      try {
        const storedAttemptId = localStorage.getItem(`cbt_attempt_${test.id}`);
        if (storedAttemptId) {
          const serverState = await apiClient.getAttemptState(storedAttemptId);
          if (serverState && serverState.status === 'in_progress') {
            if (typeof serverState.remainingSeconds === 'number' && serverState.remainingSeconds > 0) {
              restoredTimer = serverState.remainingSeconds;
            }
            if (serverState.responses && Object.keys(serverState.responses).length > 0) {
              const safeMap: Record<string, QuestionResponse> = {};
              Object.entries(serverState.responses).forEach(([qid, item]: [string, any]) => {
                safeMap[qid] = {
                  selectedOption: item?.selectedOption ?? null,
                  markedForReview: Boolean(item?.markedForReview),
                  timeSpentSeconds: Number(item?.timeSpentSeconds) || 0
                };
              });
              restoredResponses = {
                ...restoredResponses,
                ...safeMap
              };
            }
          }
        }
      } catch (recoveryErr) {
        console.warn('Authoritative CBT state recovery skipped fallback:', recoveryErr);
      }

      setResponses(restoredResponses);
      setTimerSeconds(restoredTimer);
      setCurrentIndex(draft.currentIndex || 0);
      const visited = new Set<number>();
      Object.keys(restoredResponses).forEach(qId => {
        const qIdx = qs.findIndex(q => q.id === qId);
        if (qIdx !== -1) visited.add(qIdx);
      });
      visited.add(draft.currentIndex || 0);
      setVisitedQuestions(visited);
    } else {
      // Start fresh
      setCurrentIndex(0);
      setVisitedQuestions(new Set([0]));
      setTimerSeconds(test.durationMinutes * 60);

      const initialResp: Record<string, QuestionResponse> = {};
      const initialTelem: Record<string, any> = {};
      qs.forEach((q, idx) => {
        initialResp[q.id] = {
          selectedOption: null,
          markedForReview: false,
          timeSpentSeconds: 0
        };
        initialTelem[q.id] = {
          visitCount: idx === 0 ? 1 : 0,
          timeSpentSeconds: 0,
          timeToFirstActionSeconds: null,
          answerChangeCount: 0,
          reviewToggleCount: 0,
          initialOption: null,
          finalOption: null,
          telemetryEvents: []
        };
      });
      setResponses(initialResp);
      setTelemetry(initialTelem);
      setQuestionEntryTime(Date.now());
      mockTestService.clearDraft(test.id);
    }

    setIsTimerRunning(true);
    setPendingTestToStart(null);
  };

  const handleExitTest = () => {
    if (activeTest) {
      mockTestService.saveDraft(activeTest.id, responses, timerSeconds, currentIndex);
    }
    setActiveTest(null);
    onTestActiveChange?.(false);
  };

  const handleKeypadPress = (val: string) => {
    if (!questions[currentIndex]) return;
    const qId = questions[currentIndex].id;
    const currentVal = responses[qId]?.selectedOption || '';
    let newVal = currentVal;

    if (val === 'CLEAR') {
      newVal = '';
    } else if (val === 'BACK') {
      newVal = currentVal.slice(0, -1);
    } else if (val === '-') {
      if (!currentVal) newVal = '-';
      else if (currentVal.startsWith('-')) newVal = currentVal.slice(1);
      else newVal = '-' + currentVal;
    } else if (val === '.') {
      if (!currentVal.includes('.')) newVal = currentVal + '.';
    } else {
      newVal = currentVal + val;
    }

    handleSelectOption(newVal);
  };

  const handleSelectOption = (optionId: string) => {
    if (!questions[currentIndex]) return;
    const qId = questions[currentIndex].id;
    const now = Date.now();
    const elapsedOnQuestion = Math.max(0.5, (now - questionEntryTime) / 1000);

    setResponses(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        selectedOption: optionId
      }
    }));

    setTelemetry(prev => {
      const currentQTelem = prev[qId] || {
        visitCount: 1,
        timeSpentSeconds: 0,
        timeToFirstActionSeconds: null,
        answerChangeCount: 0,
        reviewToggleCount: 0,
        initialOption: null,
        finalOption: null,
        telemetryEvents: []
      };

      const isFirstAction = currentQTelem.timeToFirstActionSeconds === null;
      const firstActionTime = isFirstAction ? Math.round(elapsedOnQuestion * 10) / 10 : currentQTelem.timeToFirstActionSeconds;
      const isChange = currentQTelem.finalOption !== null && currentQTelem.finalOption !== optionId;

      return {
        ...prev,
        [qId]: {
          ...currentQTelem,
          timeToFirstActionSeconds: firstActionTime,
          initialOption: currentQTelem.initialOption || optionId,
          finalOption: optionId,
          answerChangeCount: isChange ? currentQTelem.answerChangeCount + 1 : currentQTelem.answerChangeCount,
          telemetryEvents: [
            ...currentQTelem.telemetryEvents,
            { type: 'select_option', optionId, timestamp: now }
          ]
        }
      };
    });
  };

  const handleClearResponse = () => {
    if (!questions[currentIndex]) return;
    const qId = questions[currentIndex].id;
    const now = Date.now();
    setResponses(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        selectedOption: null
      }
    }));

    setTelemetry(prev => {
      const cur = prev[qId];
      if (!cur) return prev;
      return {
        ...prev,
        [qId]: {
          ...cur,
          finalOption: null,
          answerChangeCount: cur.finalOption ? cur.answerChangeCount + 1 : cur.answerChangeCount,
          telemetryEvents: [
            ...cur.telemetryEvents,
            { type: 'clear_response', timestamp: now }
          ]
        }
      };
    });
  };

  const handleToggleMarkForReview = () => {
    if (!questions[currentIndex]) return;
    const qId = questions[currentIndex].id;
    const now = Date.now();
    setResponses(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        markedForReview: !prev[qId]?.markedForReview
      }
    }));

    setTelemetry(prev => {
      const cur = prev[qId];
      if (!cur) return prev;
      return {
        ...prev,
        [qId]: {
          ...cur,
          reviewToggleCount: cur.reviewToggleCount + 1,
          telemetryEvents: [
            ...cur.telemetryEvents,
            { type: 'toggle_review', timestamp: now }
          ]
        }
      };
    });
  };

  const handleNavigateQuestion = (targetIndex: number) => {
    if (targetIndex >= 0 && targetIndex < questions.length && targetIndex !== currentIndex) {
      const now = Date.now();
      const elapsedSeconds = Math.max(1, Math.round((now - questionEntryTime) / 1000));
      const currentQId = questions[currentIndex]?.id;
      const targetQId = questions[targetIndex]?.id;

      // Accumulate time on previous question without double-counting
      if (currentQId) {
        setResponses(prev => ({
          ...prev,
          [currentQId]: {
            ...prev[currentQId],
            timeSpentSeconds: (prev[currentQId]?.timeSpentSeconds || 0) + elapsedSeconds
          }
        }));

        setTelemetry(prev => {
          const cur = prev[currentQId];
          const target = prev[targetQId];
          return {
            ...prev,
            [currentQId]: {
              ...cur,
              timeSpentSeconds: (cur?.timeSpentSeconds || 0) + elapsedSeconds,
              telemetryEvents: [
                ...(cur?.telemetryEvents || []),
                { type: 'leave_question', durationSeconds: elapsedSeconds, timestamp: now }
              ]
            },
            ...(targetQId ? {
              [targetQId]: {
                ...target,
                visitCount: (target?.visitCount || 0) + 1,
                telemetryEvents: [
                  ...(target?.telemetryEvents || []),
                  { type: 'enter_question', timestamp: now }
                ]
              }
            } : {})
          };
        });
      }

      setCurrentIndex(targetIndex);
      setQuestionEntryTime(Date.now());
      setVisitedQuestions(prev => new Set(prev).add(targetIndex));
    }
  };

  const handleSubmitTest = async () => {
    if (!activeTest || isSubmitting) return;
    setIsSubmitting(true);
    setIsTimerRunning(false);

    const now = Date.now();
    const elapsedOnFinalQ = Math.max(1, Math.round((now - questionEntryTime) / 1000));
    const activeQId = questions[currentIndex]?.id;

    // Finalize responses and telemetry with remaining elapsed duration
    const finalResponses = { ...responses };
    const finalTelemetry = { ...telemetry };

    if (activeQId) {
      finalResponses[activeQId] = {
        ...finalResponses[activeQId],
        timeSpentSeconds: (finalResponses[activeQId]?.timeSpentSeconds || 0) + elapsedOnFinalQ
      };
      if (finalTelemetry[activeQId]) {
        finalTelemetry[activeQId] = {
          ...finalTelemetry[activeQId],
          timeSpentSeconds: (finalTelemetry[activeQId]?.timeSpentSeconds || 0) + elapsedOnFinalQ
        };
      }
    }

    const timeSpent = activeTest.durationMinutes * 60 - timerSeconds;
    const result = await mockTestService.submitTest(
      activeTest.id,
      finalResponses,
      Math.max(30, timeSpent),
      finalTelemetry
    );

    setIsSubmitting(false);
    setShowSubmitModal(false);
    setActiveTest(null);
    onTestActiveChange?.(false);

    if (onTestSubmitted) {
      onTestSubmitted(result.id);
    }
    onNavigate('results');
  };

  // Filtered & Sorted Tests Library
  const filteredTests = tests
    .filter(t => {
      if (selectedType !== 'All' && t.type !== selectedType) return false;
      if (selectedDifficulty !== 'All' && t.difficulty !== selectedDifficulty) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDesc = t.description.toLowerCase().includes(query);
        const matchesSubject = t.subject ? t.subject.toLowerCase().includes(query) : false;
        if (!matchesTitle && !matchesDesc && !matchesSubject) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'duration') return b.durationMinutes - a.durationMinutes;
      if (sortBy === 'questions') return b.questionsCount - a.questionsCount;
      return 0;
    });

  // Calculate palette status
  const getQuestionStatus = (index: number) => {
    const q = questions[index];
    if (!q) return 'not-visited';
    const resp = responses[q.id];
    const isVisited = visitedQuestions.has(index);

    if (resp?.markedForReview && resp?.selectedOption) return 'answered-marked';
    if (resp?.markedForReview) return 'marked';
    if (resp?.selectedOption) return 'answered';
    if (isVisited) return 'not-answered';
    return 'not-visited';
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Counts for active test summary
  const answeredCount = Object.values(responses).filter(r => r.selectedOption !== null && !r.markedForReview).length;
  const answeredAndMarkedCount = Object.values(responses).filter(r => r.selectedOption !== null && r.markedForReview).length;
  const markedOnlyCount = Object.values(responses).filter(r => r.selectedOption === null && r.markedForReview).length;
  const notAnsweredVisitedCount = Array.from(visitedQuestions).filter(idx => {
    const q = questions[idx];
    if (!q) return false;
    const r = responses[q.id];
    return !r?.selectedOption && !r?.markedForReview;
  }).length;
  const notVisitedCount = questions.length - visitedQuestions.size;

  // Active section breakdown
  const sectionQuestions = {
    Physics: questions.filter(q => q.subject === 'Physics'),
    Chemistry: questions.filter(q => q.subject === 'Chemistry'),
    Mathematics: questions.filter(q => q.subject === 'Mathematics')
  };

  // Render Full Screen / Modal Test Taking Interface if active
  if (activeTest) {
    const currentQ = questions[currentIndex];
    const currentResp = currentQ ? responses[currentQ.id] : null;

    // Determine questions to show in palette based on activeSectionFilter
    const visiblePaletteIndices = questions
      .map((q, idx) => ({ q, idx }))
      .filter(item => activeSectionFilter === 'All' || item.q.subject === activeSectionFilter)
      .map(item => item.idx);

    return (
      <div style={{ backgroundColor: 'var(--bg-app)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Test Header */}
        <header
          style={{
            height: '58px',
            backgroundColor: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-default)',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 30
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>{activeTest.title}</span>
            <span className="badge badge-default" style={{ fontSize: '11px' }}>
              Q{currentIndex + 1} of {questions.length}
            </span>
            <span className="badge badge-blue" style={{ fontSize: '11px' }}>
              Marking Scheme: +4, -1
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Live Timer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                backgroundColor: timerSeconds < 300 ? 'var(--danger-bg)' : 'var(--bg-surface-subtle)',
                border: `1px solid ${timerSeconds < 300 ? 'var(--danger-border)' : 'var(--border-default)'}`,
                borderRadius: '6px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                fontSize: '15px',
                color: timerSeconds < 300 ? 'var(--danger)' : 'var(--text-primary)'
              }}
            >
              <Clock size={16} />
              <span>{formatTimer(timerSeconds)}</span>
            </div>

            <button
              onClick={handleExitTest}
              className="btn btn-secondary btn-sm"
              style={{ padding: '7px 14px' }}
              title="Save progress and return to tests library"
            >
              Save & Exit
            </button>

            <button
              onClick={() => setShowSubmitModal(true)}
              className="btn btn-primary btn-sm"
              style={{ padding: '7px 18px', gap: '6px' }}
            >
              <Send size={14} />
              <span>Submit Test</span>
            </button>
          </div>
        </header>

        {/* Section Quick Switcher Tabs */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-default)',
            padding: '6px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Sections:</span>
          {(['All', 'Physics', 'Chemistry', 'Mathematics'] as const).map(sec => {
            const count = sec === 'All' ? questions.length : sectionQuestions[sec].length;
            if (count === 0 && sec !== 'All') return null;

            const isCurrentSection = sec === 'All'
              ? activeSectionFilter === 'All'
              : currentQ?.subject === sec;

            return (
              <button
                key={sec}
                onClick={() => {
                  setActiveSectionFilter(sec);
                  if (sec !== 'All') {
                    const firstIdx = questions.findIndex(q => q.subject === sec);
                    if (firstIdx !== -1) handleNavigateQuestion(firstIdx);
                  }
                }}
                className={`btn btn-sm ${isCurrentSection ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '12px', padding: '4px 12px' }}
              >
                {sec} ({count})
              </button>
            );
          })}
        </div>

        {/* Main Test Screen Body */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', minHeight: 0 }} className="test-interface-grid">
          {/* Left: Question Area */}
          <div style={{ padding: '24px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {currentQ && (
              <>
                {/* Question Info Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '14px',
                    borderBottom: '1px solid var(--border-default)',
                    marginBottom: '20px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Question {currentIndex + 1} of {questions.length}
                    </span>
                    <span className="badge badge-default">{currentQ.subject}</span>
                    <span className="badge badge-blue">{currentQ.topic}</span>
                    <span className="badge badge-warning" style={{ fontSize: '11px' }}>{currentQ.difficulty}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {(!currentQ.options || currentQ.options.length === 0) ? (
                      <>Numerical Type: Correct <strong style={{ color: 'var(--success)' }}>+4</strong> | Incorrect <strong style={{ color: 'var(--text-muted)' }}>0</strong> | Unanswered <strong>0</strong></>
                    ) : (
                      <>MCQ Type: Correct <strong style={{ color: 'var(--success)' }}>+4</strong> | Incorrect <strong style={{ color: 'var(--danger)' }}>-1</strong> | Unanswered <strong>0</strong></>
                    )}
                  </div>
                </div>

                {/* Question Statement */}
                <div
                  style={{
                    fontSize: '15px',
                    lineHeight: 1.6,
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--bg-surface)',
                    padding: '22px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-default)',
                    marginBottom: '24px'
                  }}
                >
                  <MathRenderer text={currentQ.statement} />
                </div>

                {/* Multiple Choice Options OR Numerical Keypad */}
                {currentQ.options && currentQ.options.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                    {currentQ.options.map(opt => {
                      const isSelected = currentResp?.selectedOption === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleSelectOption(opt.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            padding: '14px 18px',
                            borderRadius: '8px',
                            border: `1px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border-default)'}`,
                            backgroundColor: isSelected ? 'var(--accent-blue-light)' : 'var(--bg-surface)',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)'
                          }}
                        >
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              border: `2px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border-strong)'}`,
                              backgroundColor: isSelected ? 'var(--accent-blue)' : 'transparent',
                              color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 700,
                              flexShrink: 0
                            }}
                          >
                            {opt.id}
                          </div>
                          <span style={{ fontSize: '14px', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isSelected ? 500 : 400 }}>
                            <MathRenderer text={opt.text} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ marginBottom: '32px', padding: '18px', backgroundColor: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                        Numerical Answer Input (NTA Virtual Keypad):
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="text"
                          readOnly
                          value={currentResp?.selectedOption || ''}
                          placeholder="Click keys below to input answer..."
                          className="input-control"
                          style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '1px', width: '300px', backgroundColor: 'var(--bg-app)' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleKeypadPress('CLEAR')}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '6px 14px' }}
                        >
                          Clear Input
                        </button>
                      </div>
                    </div>

                    {/* NTA Virtual Keypad Matrix */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 60px)', gap: '8px', maxWidth: '270px' }}>
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '-'].map(k => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => handleKeypadPress(k)}
                          className="btn btn-secondary"
                          style={{ height: '42px', fontSize: '15px', fontWeight: 600 }}
                        >
                          {k}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('BACK')}
                        className="btn btn-secondary"
                        style={{ gridColumn: 'span 2', height: '38px', fontSize: '12px' }}
                      >
                        Backspace
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('CLEAR')}
                        className="btn btn-secondary"
                        style={{ gridColumn: 'span 2', height: '38px', fontSize: '12px' }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                {/* Bottom Navigation & Action Buttons */}
                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: '20px',
                    borderTop: '1px solid var(--border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={handleToggleMarkForReview}
                      className={`btn ${currentResp?.markedForReview ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      style={{ gap: '6px' }}
                    >
                      <Bookmark size={14} />
                      <span>{currentResp?.markedForReview ? 'Marked for Review' : 'Mark for Review'}</span>
                    </button>
                    {currentResp?.selectedOption && (
                      <button
                        onClick={handleClearResponse}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--danger)', gap: '6px' }}
                      >
                        <RotateCcw size={13} />
                        <span>Clear Response</span>
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleNavigateQuestion(currentIndex - 1)}
                      disabled={currentIndex === 0}
                      className="btn btn-secondary btn-sm"
                      style={{ gap: '6px', opacity: currentIndex === 0 ? 0.5 : 1 }}
                    >
                      <ChevronLeft size={15} />
                      <span>Previous</span>
                    </button>
                    <button
                      onClick={() => handleNavigateQuestion(currentIndex + 1)}
                      disabled={currentIndex === questions.length - 1}
                      className="btn btn-primary btn-sm"
                      style={{ gap: '6px' }}
                    >
                      <span>Save & Next</span>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right: Question Palette & Overview Sidebar */}
          <aside
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border-default)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              overflowY: 'auto'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600 }}>Question Palette</h4>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {visiblePaletteIndices.length} Questions
                </span>
              </div>

              {/* 5-State Complete Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '16px', padding: '10px', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#16a34a' }} />
                    <span>Answered</span>
                  </div>
                  <strong>{answeredCount}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#dc2626' }} />
                    <span>Not Answered</span>
                  </div>
                  <strong>{notAnsweredVisitedCount}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#7c3aed' }} />
                    <span>Marked for Review</span>
                  </div>
                  <strong>{markedOnlyCount}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#7c3aed', position: 'relative' }}>
                      <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a', border: '1px solid #fff' }} />
                    </span>
                    <span>Answered & Marked</span>
                  </div>
                  <strong>{answeredAndMarkedCount}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#cbd5e1' }} />
                    <span>Not Visited</span>
                  </div>
                  <strong>{notVisitedCount}</strong>
                </div>
              </div>

              {/* Palette Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                {visiblePaletteIndices.map(idx => {
                  const status = getQuestionStatus(idx);
                  const isCurrent = idx === currentIndex;

                  let bgColor = '#cbd5e1';
                  let textColor = '#334155';

                  if (status === 'answered') {
                    bgColor = '#16a34a';
                    textColor = '#ffffff';
                  } else if (status === 'not-answered') {
                    bgColor = '#dc2626';
                    textColor = '#ffffff';
                  } else if (status === 'marked' || status === 'answered-marked') {
                    bgColor = '#7c3aed';
                    textColor = '#ffffff';
                  }

                  return (
                    <button
                      key={questions[idx].id}
                      onClick={() => handleNavigateQuestion(idx)}
                      style={{
                        height: '38px',
                        borderRadius: '6px',
                        backgroundColor: bgColor,
                        color: textColor,
                        fontWeight: 600,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        outline: isCurrent ? '2px solid var(--accent-blue)' : 'none',
                        outlineOffset: '2px',
                        transition: 'transform var(--transition-fast)'
                      }}
                      title={`Question ${idx + 1} (${questions[idx].subject} - ${status})`}
                    >
                      {idx + 1}
                      {status === 'answered-marked' && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '3px',
                            right: '3px',
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: '#22c55e',
                            border: '1px solid #ffffff'
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Test Summary Box */}
            <div
              style={{
                marginTop: 'auto',
                padding: '14px',
                backgroundColor: 'var(--bg-surface-subtle)',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                fontSize: '12px'
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '6px' }}>Section Breakdown:</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                <span>Physics</span>
                <span>{sectionQuestions.Physics.length} Questions</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                <span>Chemistry</span>
                <span>{sectionQuestions.Chemistry.length} Questions</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Mathematics</span>
                <span>{sectionQuestions.Mathematics.length} Questions</span>
              </div>
            </div>
          </aside>
        </div>

        {/* Submit Confirmation Modal */}
        <Modal
          isOpen={showSubmitModal}
          onClose={() => setShowSubmitModal(false)}
          title="Submit Mock Examination"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to finish and submit your mock examination? Once submitted, your automated performance diagnostic will be calculated using standard JEE scoring rules.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                backgroundColor: 'var(--bg-surface-subtle)',
                padding: '14px',
                borderRadius: '8px',
                textAlign: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Answered</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--success)' }}>{answeredCount}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Unanswered</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--danger)' }}>
                  {questions.length - (answeredCount + answeredAndMarkedCount)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Review Only</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#7c3aed' }}>{markedOnlyCount}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ans & Review</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-blue)' }}>{answeredAndMarkedCount}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="btn btn-secondary"
                disabled={isSubmitting}
              >
                Return to Test
              </button>
              <button
                onClick={handleSubmitTest}
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Calculating Diagnostics...' : 'Yes, Submit Test'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // Standard Test Library View
  return (
    <div className="page-container">
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Mock Tests & Sectional Assessments
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Take simulated CBT examinations to generate empirical performance intelligence and diagnose topic mastery.
        </p>
      </div>

      {/* Search and Filter Toolbar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search tests by title or topic..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-control"
              style={{ paddingLeft: '32px' }}
            />
          </div>

          {/* Test Type Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Type:
            </span>
            {['All', 'Full-Length', 'Subject', 'Chapter'].map(t => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`btn btn-sm ${selectedType === t ? 'btn-primary' : 'btn-secondary'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Difficulty Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Difficulty:
            </span>
            <select
              value={selectedDifficulty}
              onChange={e => setSelectedDifficulty(e.target.value)}
              className="select-control"
            >
              <option value="All">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Moderate">Moderate</option>
              <option value="Challenging">Challenging</option>
            </select>
          </div>

          {/* Sorting */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="select-control"
            >
              <option value="default">Default Order</option>
              <option value="title">Test Title (A-Z)</option>
              <option value="duration">Longest Duration</option>
              <option value="questions">Question Count</option>
            </select>
          </div>
        </div>
      </div>

      {/* Test Library Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {filteredTests.map(test => {
          const isInteractiveDemo = test.id === 'test-jee-09';
          const draft = mockTestService.getDraft(test.id);

          return (
            <div
              key={test.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '22px',
                border: isInteractiveDemo ? '1.5px solid var(--accent-blue)' : '1px solid var(--border-default)',
                position: 'relative'
              }}
            >
              {isInteractiveDemo && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '16px',
                    backgroundColor: 'var(--accent-blue)',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  Featured Full Simulation
                </div>
              )}

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <span className="badge badge-default">{test.type}</span>
                  <span
                    className={`badge ${
                      test.difficulty === 'Challenging' ? 'badge-danger' : test.difficulty === 'Moderate' ? 'badge-warning' : 'badge-success'
                    }`}
                  >
                    {test.difficulty}
                  </span>
                  {draft && (
                    <span className="badge badge-warning" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                      In-Progress Draft
                    </span>
                  )}
                  {test.lastScore !== undefined && (
                    <span className="badge badge-blue">
                      Score: {test.lastScore}/{test.maxMarks || 300}
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.3 }}>
                  {test.title}
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                  {test.description}
                </p>
              </div>

              <div>
                {/* Meta details bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    marginBottom: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HelpCircle size={14} color="var(--text-muted)" />
                    <span>{test.questionsCount} Questions</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} color="var(--text-muted)" />
                    <span>{test.durationMinutes} Minutes</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={14} color="var(--text-muted)" />
                    <span>{test.maxMarks || test.questionsCount * 4} Marks</span>
                  </div>
                </div>

                {/* Marking scheme pill */}
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  Marking Scheme: <strong style={{ color: 'var(--success)' }}>+{test.markingScheme?.correct || 4}</strong> correct, <strong style={{ color: 'var(--danger)' }}>{test.markingScheme?.incorrect || -1}</strong> incorrect
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleOpenStartModal(test)}
                    className="btn btn-primary"
                    style={{ flex: 1, gap: '6px' }}
                  >
                    <Play size={14} fill="currentColor" />
                    <span>{draft ? 'Resume / Restart' : test.status === 'Attempted' ? 'Re-attempt Test' : 'Start Test'}</span>
                  </button>
                  {test.status === 'Attempted' && (
                    <button
                      onClick={() => onNavigate('results')}
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px' }}
                      title="Review previous diagnostic results"
                    >
                      <BarChart size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pre-Test Confirmation Modal */}
      <Modal
        isOpen={pendingTestToStart !== null}
        onClose={() => setPendingTestToStart(null)}
        title={pendingTestToStart?.title || 'Examination Instructions'}
        maxWidth="540px"
      >
        {pendingTestToStart && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '14px', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center', fontSize: '12px' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Questions</div>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>{pendingTestToStart.questionsCount}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Duration</div>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>{pendingTestToStart.durationMinutes} mins</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Max Score</div>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>{pendingTestToStart.maxMarks || pendingTestToStart.questionsCount * 4}</div>
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Examination Rules & Marking Scheme:</h4>
              <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: '18px' }}>
                <li><strong>Correct answer:</strong> +{pendingTestToStart.markingScheme?.correct || 4} marks</li>
                <li><strong>Incorrect response:</strong> {pendingTestToStart.markingScheme?.incorrect || -1} marks (negative penalty)</li>
                <li><strong>Unanswered question:</strong> {pendingTestToStart.markingScheme?.unattempted || 0} marks</li>
                <li>The test timer counts down automatically. Accidental refreshes will retain your progress in browser draft memory.</li>
              </ul>
            </div>

            {hasExistingDraft && (
              <div style={{ padding: '10px 14px', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '12px', color: '#92400e' }}>
                <strong>Saved In-Progress Draft Detected:</strong> You have an unfinished attempt saved locally for this test. You can choose to resume where you left off or start fresh.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={() => setPendingTestToStart(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              {hasExistingDraft ? (
                <>
                  <button
                    onClick={() => handleConfirmStart(false)}
                    className="btn btn-secondary"
                  >
                    Start Fresh
                  </button>
                  <button
                    onClick={() => handleConfirmStart(true)}
                    className="btn btn-primary"
                  >
                    Resume In-Progress
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleConfirmStart(false)}
                  className="btn btn-primary"
                >
                  Enter Examination
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
