import { TopicPerformance, Question, Priority } from '../types';
import { TOPIC_PERFORMANCES, SAMPLE_QUESTIONS_MOCK_09, SAMPLE_QUESTIONS_MATH_SEC } from '../data/demoData';
import { apiClient } from './apiClient';

const ATTEMPTS_STORAGE_KEY = 'jee_insight_test_attempts';

export interface IWeakConceptsService {
  getTopics(params?: {
    subject?: string;
    priority?: string;
    search?: string;
    sortBy?: 'accuracy-asc' | 'accuracy-desc' | 'attempts-desc' | 'time-desc' | 'priority';
  }): Promise<TopicPerformance[]>;
  getTopicById(id: string): Promise<TopicPerformance | null>;
  getSampleQuestionsForTopic(topic: string, subject?: string): Promise<Question[]>;
  evaluatePracticeAnswer(questionId: string, answerOrOption?: string | { selectedOption?: string | null; numericalAnswer?: any }, numericalVal?: string | number): Promise<any>;
}

class LocalWeakConceptsService implements IWeakConceptsService {
  async getTopics(params?: {
    subject?: string;
    priority?: string;
    search?: string;
    sortBy?: 'accuracy-asc' | 'accuracy-desc' | 'attempts-desc' | 'time-desc' | 'priority';
  }): Promise<TopicPerformance[]> {
    const list = [...TOPIC_PERFORMANCES];

    // Check if user submitted attempts exist in localStorage
    const stored = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
    if (stored) {
      try {
        const attempts = JSON.parse(stored);
        attempts.forEach((att: any) => {
          att.topicBreakdown?.forEach((tb: any) => {
            const match = list.find(t => t.topic.toLowerCase() === tb.topic.toLowerCase());
            if (match) {
              const combinedAttempts = match.attemptCount + tb.total;
              const combinedAcc = Math.round(((match.accuracy * match.attemptCount) + (tb.accuracy * tb.total)) / combinedAttempts);
              match.accuracy = combinedAcc;
              match.attemptCount = combinedAttempts;
              match.priority = combinedAcc < 50 ? 'High' : combinedAcc < 70 ? 'Medium' : 'Low';
              match.trend = tb.accuracy > match.accuracy ? 'Improving' : tb.accuracy < match.accuracy ? 'Declining' : 'Stable';
            }
          });
        });
      } catch {
        // ignore
      }
    }

    let result = list;

    if (params?.subject && params.subject !== 'All') {
      result = result.filter(t => t.subject === params.subject);
    }

    if (params?.priority && params.priority !== 'All') {
      result = result.filter(t => t.priority === params.priority);
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      result = result.filter(
        t => t.topic.toLowerCase().includes(q) || t.subtopics.some(s => s.toLowerCase().includes(q))
      );
    }

    const priorityWeight: Record<Priority, number> = { High: 3, Medium: 2, Low: 1 };

    switch (params?.sortBy) {
      case 'accuracy-asc':
        result.sort((a, b) => a.accuracy - b.accuracy);
        break;
      case 'accuracy-desc':
        result.sort((a, b) => b.accuracy - a.accuracy);
        break;
      case 'attempts-desc':
        result.sort((a, b) => b.attemptCount - a.attemptCount);
        break;
      case 'time-desc':
        result.sort((a, b) => b.avgTimeSeconds - a.avgTimeSeconds);
        break;
      case 'priority':
      default:
        result.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority] || a.accuracy - b.accuracy);
        break;
    }

    return result;
  }

  async getTopicById(id: string): Promise<TopicPerformance | null> {
    const list = await this.getTopics();
    const item = list.find(t => t.id === id);
    return item ? { ...item } : null;
  }

  async getSampleQuestionsForTopic(topic: string, _subject?: string): Promise<Question[]> {
    const allPool = [...SAMPLE_QUESTIONS_MOCK_09, ...SAMPLE_QUESTIONS_MATH_SEC];
    const matched = allPool.filter(q => q.topic.toLowerCase().includes(topic.toLowerCase()) || topic.toLowerCase().includes(q.topic.toLowerCase()));
    return matched.slice(0, 3);
  }

  async evaluatePracticeAnswer(questionId: string, answer: { selectedOption?: string | null; numericalAnswer?: string | null }) {
    const allPool = [...SAMPLE_QUESTIONS_MOCK_09, ...SAMPLE_QUESTIONS_MATH_SEC];
    const q = allPool.find(item => item.id === questionId);
    const isCorrect = q ? q.correctOptionId === answer.selectedOption : true;
    return {
      questionId,
      isCorrect,
      marksAwarded: isCorrect ? 4 : -1,
      correctOptionId: q?.correctOptionId,
      explanation: q?.explanation || 'Solution preview in offline mode.'
    };
  }
}

class HybridWeakConceptsService implements IWeakConceptsService {
  private localService = new LocalWeakConceptsService();

  async getTopics(params?: {
    subject?: string;
    priority?: string;
    search?: string;
    sortBy?: 'accuracy-asc' | 'accuracy-desc' | 'attempts-desc' | 'time-desc' | 'priority';
  }): Promise<TopicPerformance[]> {
    try {
      if (await apiClient.isBackendAvailable()) {
        const topics = await apiClient.getWeakConcepts(params?.subject, params?.priority);
        if (topics && topics.length > 0) {
          let list: TopicPerformance[] = topics.map((t: any) => ({
            id: t.id,
            subject: t.subject,
            topic: t.topic,
            accuracy: t.accuracy,
            attemptCount: t.attemptCount,
            totalQuestions: t.totalQuestions,
            avgTimeSeconds: t.avgTimeSeconds,
            priority: t.priority as Priority,
            trend: t.trend as any,
            reason: t.reason,
            recommendedAction: t.recommendedAction,
            subtopics: t.subtopics || []
          }));

          if (params?.search && params.search.trim()) {
            const q = params.search.toLowerCase().trim();
            list = list.filter(t => t.topic.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q));
          }

          if (params?.sortBy) {
            switch (params.sortBy) {
              case 'accuracy-asc':
                list.sort((a, b) => a.accuracy - b.accuracy);
                break;
              case 'accuracy-desc':
                list.sort((a, b) => b.accuracy - a.accuracy);
                break;
              case 'attempts-desc':
                list.sort((a, b) => b.attemptCount - a.attemptCount);
                break;
              case 'time-desc':
                list.sort((a, b) => b.avgTimeSeconds - a.avgTimeSeconds);
                break;
              case 'priority':
                const order: Record<string, number> = { High: 1, Medium: 2, Low: 3 };
                list.sort((a, b) => (order[a.priority] || 4) - (order[b.priority] || 4));
                break;
            }
          }
          return list;
        }
      }
    } catch (err) {
      console.warn('Backend weak concepts failed, using local:', err);
    }
    return this.localService.getTopics(params);
  }

  async getTopicById(id: string): Promise<TopicPerformance | null> {
    const list = await this.getTopics();
    const item = list.find(t => t.id === id);
    return item ? { ...item } : null;
  }

  async getSampleQuestionsForTopic(topic: string, subject?: string): Promise<Question[]> {
    try {
      if (await apiClient.isBackendAvailable()) {
        const resp = await apiClient.searchQuestions({ topic, subject, limit: 5 });
        if (resp && resp.items && resp.items.length > 0) {
          return resp.items.map((q: any) => ({
            id: q.id,
            testId: q.testId || 'practice-drill',
            questionNumber: q.questionNumber || 1,
            subject: q.subject,
            topic: q.topic || topic,
            statement: q.statement,
            options: (q.options || []).map((o: any) => ({ id: o.id, text: o.text })),
            correctOptionId: q.correctOptionId,
            explanation: q.explanation || 'Step-by-step solution available after check.',
            difficulty: q.difficulty || 'Moderate',
            positiveMarks: q.positiveMarks || 4,
            negativeMarks: q.negativeMarks || -1,
            questionType: q.questionType || 'single_correct',
            numericalAnswer: q.numericalAnswer
          }));
        }
        // Return explicit empty list so empty state can be rendered. Never substitute unrelated questions!
        return [];
      }
    } catch (err) {
      console.warn('Backend question retrieval failed for topic:', topic, err);
    }
    return this.localService.getSampleQuestionsForTopic(topic, subject);
  }

  async evaluatePracticeAnswer(
    questionId: string,
    answerOrOption?: string | { selectedOption?: string | null; numericalAnswer?: any },
    numericalVal?: string | number
  ) {
    const payload = typeof answerOrOption === 'object' && answerOrOption !== null
      ? answerOrOption
      : {
          selectedOption: typeof answerOrOption === 'string' ? answerOrOption : null,
          numericalAnswer: numericalVal !== undefined ? String(numericalVal) : null
        };

    try {
      if (await apiClient.isBackendAvailable()) {
        return await apiClient.evaluateQuestionAnswer({
          questionId,
          selectedOption: payload.selectedOption || undefined,
          numericalAnswer: payload.numericalAnswer || undefined
        });
      }
    } catch (err) {
      console.warn('Backend evaluation failed, falling back to local check:', err);
    }
    return this.localService.evaluatePracticeAnswer(questionId, payload);
  }
}

export const weakConceptsService: IWeakConceptsService = new HybridWeakConceptsService();

