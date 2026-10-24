import { ChatMessage } from '../types';
import { INITIAL_AI_CHAT_MESSAGES, AI_KNOWLEDGE_BASE } from '../data/demoData';
import { mockTestService } from './mockTestService';
import { apiClient } from './apiClient';

const CHAT_STORAGE_KEY = 'jee_insight_chat_history';

export interface SendMessageOptions {
  contextTopic?: string;
  questionId?: string;
  attemptId?: string;
  availableStudyHours?: number;
}

export interface CoachStatusInfo {
  isLiveAiAvailable: boolean;
  model: string;
  provider: string;
  contextSourcesAvailable: string[];
}

export interface IAICoachService {
  getMessages(): Promise<ChatMessage[]>;
  sendMessage(
    userText: string,
    options?: string | SendMessageOptions
  ): Promise<{ userMsg: ChatMessage; coachMsg: ChatMessage }>;
  clearChat(): Promise<ChatMessage[]>;
  getCoachStatus(): Promise<CoachStatusInfo>;
}

class LocalAICoachService implements IAICoachService {
  public getStored(): ChatMessage[] {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(INITIAL_AI_CHAT_MESSAGES));
      return [...INITIAL_AI_CHAT_MESSAGES];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [...INITIAL_AI_CHAT_MESSAGES];
    }
  }

  public save(messages: ChatMessage[]): void {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  }

  async getMessages(): Promise<ChatMessage[]> {
    return this.getStored();
  }

  async getCoachStatus(): Promise<CoachStatusInfo> {
    return {
      isLiveAiAvailable: false,
      model: 'offline-diagnostic-heuristics',
      provider: 'Offline Diagnostic Engine',
      contextSourcesAvailable: ['Stored Mock Tests', 'Weak Concepts Matrix', 'Demo Baseline']
    };
  }

  async sendMessage(
    userText: string,
    options?: string | SendMessageOptions
  ): Promise<{ userMsg: ChatMessage; coachMsg: ChatMessage }> {
    const opts: SendMessageOptions = typeof options === 'string' ? { contextTopic: options } : (options || {});
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'student',
      text: userText,
      timestamp: timeStr,
      contextTopic: opts.contextTopic,
      questionId: opts.questionId,
      attemptId: opts.attemptId
    };

    // Retrieve latest attempt context if exists
    const latestAttempt = await mockTestService.getLatestAttempt();
    const currentScore = latestAttempt ? latestAttempt.score : 112;
    const currentAccuracy = latestAttempt ? latestAttempt.accuracy : 64;

    const q = userText.toLowerCase();
    let reply = '';
    let suggestions: string[] = [
      'Explain my mistakes in Mock 8',
      'Help me understand Integration',
      'Create a seven-day revision plan'
    ];
    let actionLinks: ChatMessage['actionLinks'] = [];

    if (opts.questionId || q.includes('question') || q.includes('q-')) {
      const qTarget = opts.questionId || 'the requested problem';
      reply = `### Question Diagnostic Autopsy (${qTarget})

• **Core Concept**: Analyzing key concepts and common traps for this JEE Main problem.
• **Common Failure Mode**: Students typically struggle with either algebraic sign conventions or attempting complex expansion without checking trigonometric invariants or properties.
• **Recommended Step-by-Step Approach**:
  1. Inspect invariants before expanding (e.g. King's Property in Definite Integrals or conservation laws in Mechanics).
  2. Verify boundary conditions and limits at each substitution step.
  3. Re-check calculations before submitting to avoid -1 negative marking penalties.

Would you like to practice 5 similar questions or review the prerequisite theory?`;
      suggestions = ['How to avoid negative marks in Maths?', 'Practice similar questions', 'Add topic to Study Planner'];
      actionLinks = [
        { label: 'View Weak Concepts', page: 'weak-concepts' },
        { label: 'Open Study Planner', page: 'study-planner' }
      ];
    } else if (q.includes('score') || q.includes('why') || q.includes('change') || q.includes('trajectory')) {
      reply = `Here is the data breakdown of your recent performance:

1. **Current Benchmark**: Your latest recorded score is **${currentScore}/300** with **${currentAccuracy}%** accuracy.
2. **Physics**: Demonstrates solid stability (~52 marks), led by strong accuracy in Kinematics and Current Electricity.
3. **Chemistry**: Solid consistency (~44 marks), with rapid pacing (~98s/question).
4. **Mathematics**: The primary bottleneck (~16 marks, 51% accuracy). High negative marking penalties (-12 marks penalty) drag your aggregate score.
5. **Key Leverage**: Eliminating hasty guesses in Mathematics alone would immediately lift your score by +10 to +14 marks without solving a single extra problem!`;
      suggestions = ['How to avoid negative marks in Maths?', 'Breakdown Integration mistakes', 'Create a 7-day study plan'];
      actionLinks = [
        { label: 'View Performance Analytics', page: 'analytics' },
        { label: 'Simulate Score Scenarios', page: 'score-simulator' }
      ];
    } else if (q.includes('integration') || q.includes('integral') || q.includes('calculus') || q.includes("king's")) {
      reply = `Let us address your Integration performance (38% accuracy, 228s avg solving time):

• **Root Cause Detected**: In your mock responses, errors were concentrated in two areas:
  1. Forgetting to apply King's Property (∫₀ᵃ f(x)dx = ∫₀ᵃ f(a-x)dx) before expanding complex fractional integrands.
  2. Sign mistakes during trigonometric half-angle substitutions.

• **Concrete 3-Step Fix**:
  1. **Triage First (10 seconds)**: Before writing, inspect whether f(a-x) simplifies the denominator. If denominator remains invariant (e.g., sin⁴x + cos⁴x), King's property yields the solution in 3 lines.
  2. **Boundary Checks**: Always evaluate limits at each substitution step rather than back-substituting x at the end.
  3. **Targeted Practice**: Complete 15 curated property integrals today.`;
      suggestions = ['Add Integration tasks to Study Planner', 'Practice Chapter Sprint', 'Time management for Calculus'];
      actionLinks = [
        { label: 'Inspect Integration in Weak Concepts', page: 'weak-concepts', context: 'Integration' },
        { label: 'Open Study Planner', page: 'study-planner' }
      ];
    } else if (q.includes('mistake') || q.includes('mock 8') || q.includes('error') || q.includes('wrong') || q.includes('negative')) {
      reply = `Analysis of your incorrect responses in your mock diagnostic:

• **Negative Marking Penalty**: 20 incorrect answers (resulting in -20 negative marks penalty).
• **Mathematics (12 negatives)**:
  - 4 questions in Indefinite Integration attempted with incomplete substitutions.
  - 3 questions in Probability where conditional independence was mistakenly assumed.
  - 2 numericals with calculation rounding errors in Conic Sections.
• **Chemistry (4 negatives)**:
  - 2 questions on Carbocation rearrangement stability order (hydride vs methyl shift).
• **Physics (4 negatives)**:
  - 2 questions on rolling motion where torque was taken about a non-inertial axis.

Recommendation: If you omit uncertain guesses in Mathematics where confidence is below 70%, your baseline score jumps immediately from ${currentScore} to ~${currentScore + 12}.`;
      suggestions = ['How to build selective skipping discipline', 'Explain Carbocation rearrangements', 'Review Study Plan'];
      actionLinks = [
        { label: 'Review Diagnostic Results', page: 'results' },
        { label: 'Open Weak Concepts Matrix', page: 'weak-concepts' }
      ];
    } else if (q.includes('plan') || q.includes('seven') || q.includes('schedule') || q.includes('week') || q.includes('revision')) {
      const hours = opts.availableStudyHours || 2;
      reply = `Here is a high-leverage Precision Revision Plan tailored to your ${currentScore}/300 baseline (${hours} hours daily):

• **Session 1 (Calculus Recovery — ${Math.round(hours * 30)} mins)**:
  - Definite Integration standard properties and trigonometric half-angle substitutions.
  - 10-question timed speed drill (strict 2.5 min cap per problem).

• **Session 2 (Organic & Mechanics — ${Math.round(hours * 30)} mins)**:
  - Revisit SN1/SN2 solvent polarity tables and carbocation rearrangements.
  - Rotational dynamics torque about center of mass drills.

• **Checkpoints**:
  - Evaluate accuracy weekly on JEE InsightAI Sectional tests.
  - Categorize errors into 'Concept Gap' vs 'Silly Error' before moving to new topics.`;
      suggestions = ['Apply this plan to my Study Planner', 'Simulate score with this plan', 'Ask about Physics strategy'];
      actionLinks = [
        { label: 'View Study Planner', page: 'study-planner' }
      ];
    } else if (q.includes('time') || q.includes('speed') || q.includes('strategy') || q.includes('manage')) {
      reply = `Recommended JEE Main Time Management Architecture (180 minutes):

1. **Round 1 — The Sweep (0 to 60 mins)**:
   - Chemistry: 35 mins (target 18-20 questions).
   - Physics: 25 mins (target 10-12 direct formula questions).
   - Rule: Skip any question requiring more than 2 minutes of calculation.

2. **Round 2 — Deep Work (60 to 140 mins)**:
   - Mathematics: 45 mins (focus on high-confidence algebra, matrices, vectors).
   - Physics Mechanics & Electrodynamics: 35 mins.

3. **Round 3 — Review & Calculated Attempts (140 to 180 mins)**:
   - Return to flagged questions in Calculus and Organic Chemistry.
   - Strictly avoid wild guesses in the final 10 minutes.

This disciplined 3-round approach typically recovers 15-20 marks lost to rushed end-of-test errors.`;
      suggestions = ['How does simulator evaluate speed?', 'Review weak concepts', 'Start Mock Test'];
      actionLinks = [
        { label: 'Launch Mock Test', page: 'mock-tests' }
      ];
    } else if (q.includes('kinematic') || q.includes('physics')) {
      reply = `In Kinematics, your demonstration performance is 78% accurate across 50 attempts (102s avg time).

Key Tips for JEE Advanced & Main:
1. When dealing with projectile motion on an inclined plane, always decompose acceleration along the incline (g sin θ) and perpendicular to the incline (g cos θ).
2. For relative velocity in 2D (such as rain-man or river-boat problems), draw vector velocity triangles first before setting up component equations.
3. Keep this topic fresh by solving 5 high-difficulty mixed questions weekly.`;
      suggestions = ['Test me on Kinematics', 'Review Rotational Motion', 'View Study Plan'];
      actionLinks = [
        { label: 'Take Physics Sectional', page: 'mock-tests' }
      ];
    } else {
      reply = `I understand your question regarding "${userText}".

Evaluating this against your active profile:
• **Latest Score**: ${currentScore}/300
• **Primary Bottleneck**: Mathematics accuracy (51%) and negative marking (-12 marks penalty in Maths alone).
• **Actionable Advice**: Dedicate your next study session to Definite Integration standard substitution rules and avoid unverified guesses on difficult multiple-choice questions.

Would you like to review related concept diagnostics or add a focused drill to your Study Planner?`;
      actionLinks = [
        { label: 'Inspect Weak Concepts', page: 'weak-concepts' },
        { label: 'Open Study Planner', page: 'study-planner' }
      ];
    }

    const coachMsg: ChatMessage = {
      id: `msg-coach-${Date.now() + 1}`,
      sender: 'coach',
      text: reply,
      timestamp: timeStr,
      contextTopic: opts.contextTopic,
      questionId: opts.questionId,
      attemptId: opts.attemptId,
      isSimulated: true,
      modelUsed: 'offline-diagnostic-heuristics',
      disclaimer: 'Generated via offline rule-based heuristics (Set GEMINI_API_KEY in backend/.env to activate live Gemini AI Coach).',
      sourceSummary: 'Local diagnostic heuristics & latest test attempt data',
      actionSuggestions: suggestions,
      actionLinks
    };

    const current = this.getStored();
    const updated = [...current, userMsg, coachMsg];
    this.save(updated);

    return { userMsg, coachMsg };
  }

  async clearChat(): Promise<ChatMessage[]> {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(INITIAL_AI_CHAT_MESSAGES));
    return [...INITIAL_AI_CHAT_MESSAGES];
  }
}

class HybridAICoachService implements IAICoachService {
  private localService = new LocalAICoachService();

  async getMessages(): Promise<ChatMessage[]> {
    try {
      if (await apiClient.isBackendAvailable()) {
        const history = await apiClient.getCoachHistory();
        if (history && history.length > 0) {
          const mapped: ChatMessage[] = history.map((h: any) => ({
            id: h.id,
            sender: h.role === 'assistant' ? 'coach' : 'student',
            text: h.content || h.text,
            timestamp: h.timestamp || 'Recent',
            contextTopic: h.contextTopic,
            questionId: h.questionId,
            modelUsed: h.provider,
            isSimulated: h.provider !== 'google-gemini'
          }));
          return mapped;
        }
      }
    } catch (err) {
      console.warn('Failed to load coach history from backend, falling back to local cache:', err);
    }
    return this.localService.getMessages();
  }

  async getCoachStatus(): Promise<CoachStatusInfo> {
    try {
      if (await apiClient.isBackendAvailable()) {
        const status = await apiClient.getCoachStatus();
        if (status) {
          return {
            isLiveAiAvailable: status.isLiveAiAvailable,
            model: status.model,
            provider: status.provider,
            contextSourcesAvailable: status.contextSourcesAvailable || []
          };
        }
      }
    } catch (err) {
      console.warn('Failed to fetch coach status from backend, falling back to local info:', err);
    }
    return this.localService.getCoachStatus();
  }

  async sendMessage(
    userText: string,
    options?: string | SendMessageOptions
  ): Promise<{ userMsg: ChatMessage; coachMsg: ChatMessage }> {
    const opts: SendMessageOptions = typeof options === 'string' ? { contextTopic: options } : (options || {});
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'student',
      text: userText,
      timestamp: timeStr,
      contextTopic: opts.contextTopic,
      questionId: opts.questionId,
      attemptId: opts.attemptId
    };

    try {
      if (await apiClient.isBackendAvailable()) {
        // Collect last 6 messages from stored conversation for multi-turn coherence
        const stored = this.localService.getStored();
        const conversationHistory = stored.slice(-6).map(m => ({
          sender: m.sender,
          text: m.text
        }));

        const res = await apiClient.sendCoachChat({
          message: userText,
          contextTopic: opts.contextTopic,
          questionId: opts.questionId,
          attemptId: opts.attemptId,
          availableStudyHours: opts.availableStudyHours,
          conversationHistory
        });

        if (res && (res.text || res.reply)) {
          const coachMsg: ChatMessage = {
            id: `msg-coach-${Date.now() + 1}`,
            sender: 'coach',
            text: res.text || res.reply,
            timestamp: timeStr,
            contextTopic: opts.contextTopic,
            questionId: opts.questionId,
            attemptId: opts.attemptId,
            isSimulated: res.isSimulated,
            modelUsed: res.modelUsed,
            sourceSummary: res.sourceSummary,
            disclaimer: res.disclaimer,
            actionSuggestions: res.actionSuggestions || [],
            actionLinks: res.actionLinks || []
          };

          const raw = localStorage.getItem(CHAT_STORAGE_KEY);
          const current: ChatMessage[] = raw ? JSON.parse(raw) : [...INITIAL_AI_CHAT_MESSAGES];
          const updated = [...current, userMsg, coachMsg];
          localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updated));

          return { userMsg, coachMsg };
        }
      }
    } catch (err) {
      console.warn('Backend coach chat failed, falling back to local diagnostic heuristics:', err);
    }

    return this.localService.sendMessage(userText, opts);
  }

  async clearChat(): Promise<ChatMessage[]> {
    try {
      if (await apiClient.isBackendAvailable()) {
        await apiClient.clearCoachHistory();
      }
    } catch (err) {
      console.warn('Failed to clear backend coach history:', err);
    }
    return this.localService.clearChat();
  }
}

export const aiCoachService: IAICoachService = new HybridAICoachService();
