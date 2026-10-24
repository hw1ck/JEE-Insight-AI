export type Subject = 'Physics' | 'Chemistry' | 'Mathematics';

export type Priority = 'High' | 'Medium' | 'Low';

export type TestType = 'Full-Length' | 'Subject' | 'Chapter';

export type Difficulty = 'Easy' | 'Moderate' | 'Challenging';

export interface StudentProfile {
  id: string;
  name: string;
  targetExam: string;
  targetScore: number;
  dailyStudyHours: number;
  preferredSubjects: Subject[];
  theme: 'light' | 'dark';
  timerMode: 'Standard (180 min)' | 'Flexible Demo';
  registeredDate: string;
}

export interface TopicPerformance {
  id: string;
  subject: Subject;
  topic: string;
  accuracy: number; // percentage, e.g. 38
  attemptCount: number;
  totalQuestions: number;
  avgTimeSeconds: number;
  priority: Priority;
  trend: 'Declining' | 'Stable' | 'Improving';
  reason: string;
  recommendedAction: string;
  subtopics: string[];
}

export interface SubjectPerformance {
  subject: Subject;
  accuracy: number;
  score: number;
  totalMarks: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  avgTimeSeconds: number;
}

export interface MarkingScheme {
  correct: number;       // default: +4
  incorrect: number;     // default: -1
  unattempted: number;   // default: 0
}

export interface MockTestSummary {
  id: string;
  title: string;
  type: TestType;
  subject?: Subject;
  questionsCount: number;
  durationMinutes: number;
  maxMarks: number;
  difficulty: Difficulty;
  status: 'Attempted' | 'Available' | 'In Progress';
  lastScore?: number;
  lastAttemptDate?: string;
  description: string;
  markingScheme: MarkingScheme;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  testId: string;
  questionNumber: number;
  subject: Subject;
  topic: string;
  statement: string;
  options: QuestionOption[];
  correctOptionId: string;
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface QuestionResponse {
  selectedOption: string | null;
  markedForReview: boolean;
  timeSpentSeconds: number;
}

export interface TestAttemptResult {
  id: string;
  testId: string;
  testTitle: string;
  date: string;
  timeSpentSeconds: number;
  score: number;
  totalMarks: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  accuracy: number;
  percentile?: number;
  markingScheme: MarkingScheme;
  responses: Record<string, QuestionResponse>;
  subjectBreakdown: Record<Subject, {
    score: number;
    accuracy: number;
    correct: number;
    incorrect: number;
    unattempted: number;
    avgTime: number;
  }>;
  topicBreakdown: {
    topic: string;
    subject: Subject;
    accuracy: number;
    correct: number;
    total: number;
    avgTime: number;
  }[];
  observations: string[];
  comparisonWithPrevious?: {
    prevTestTitle: string;
    scoreDelta: number;
    accuracyDelta: number;
    mathDelta: number;
    physicsDelta: number;
    chemDelta: number;
  };
}

export interface StudyTask {
  id: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  subject: Subject;
  topic: string;
  title: string;
  durationMinutes: number;
  taskType: 'Concept Revision' | 'Timed Practice' | 'Formula Sheet' | 'Mock Analysis';
  priority: Priority;
  completed: boolean;
  reason: string;
  isAutoRecommended?: boolean;
}

export interface ScoreScenarioSimulation {
  baselineScore: number;
  mathAccuracyDelta: number;    // e.g. +15%
  chemAccuracyDelta: number;    // e.g. +10%
  physicsAccuracyDelta: number; // e.g. +10%
  negativeMarksSaved: number;   // e.g. 5 questions not guessed blindly
  extraWeeklyHours: number;     // e.g. 4
  speedOptimizationSec: number; // e.g. 20s
  estimatedScore: number;
  estimatedRankBand: string;
  estimatedPercentile: string;
  scoreDelta: number;
  breakdown: {
    fromAccuracy: number;
    fromNegativeReduction: number;
    fromExtraPractice: number;
    fromSpeedReallocation: number;
  };
  assumptions: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'student' | 'coach';
  text: string;
  timestamp: string;
  contextTopic?: string;
  questionId?: string;
  attemptId?: string;
  isSimulated?: boolean;
  modelUsed?: string;
  sourceSummary?: string;
  disclaimer?: string;
  actionSuggestions?: string[];
  actionLinks?: {
    label: string;
    page: 'overview' | 'mock-tests' | 'results' | 'analytics' | 'weak-concepts' | 'study-planner' | 'score-simulator';
    context?: string;
  }[];
}

export interface CoachStatus {
  isLiveAiAvailable: boolean;
  model: string;
  provider: string;
  contextSourcesAvailable: string[];
}


export interface HistoricalMockRecord {
  id: string;
  mockName: string;
  date: string;
  score: number;
  totalMarks: number;
  accuracy: number;
  percentile?: number;
  timeSpentMinutes: number;
  scoreDelta: number;
  physicsScore: number;
  chemScore: number;
  mathScore: number;
  attemptId?: string;
}
