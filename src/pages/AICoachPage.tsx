import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  RotateCcw,
  User,
  Clock,
  BookOpen,
  ArrowRight,
  Lightbulb,
  MessageSquare,
  Compass,
  BarChart3,
  ExternalLink,
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ChatMessage } from '../types';
import { aiCoachService, CoachStatusInfo } from '../services/aiCoachService';
import { NavPage } from '../components/layout/Sidebar';

interface AICoachPageProps {
  onNavigate: (page: NavPage, topicContext?: string) => void;
  initialTopicContext?: string;
}

export const AICoachPage: React.FC<AICoachPageProps> = ({
  onNavigate,
  initialTopicContext
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [coachStatus, setCoachStatus] = useState<CoachStatusInfo | null>(null);

  // Parse initial context: can be a question identifier ("question:q-id") or a topic name
  const isQuestion = initialTopicContext?.startsWith('question:');
  const [questionId, setQuestionId] = useState<string | undefined>(
    isQuestion ? initialTopicContext?.slice(9) : undefined
  );
  const [topicContext, setTopicContext] = useState<string | undefined>(
    !isQuestion ? initialTopicContext : undefined
  );

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const promptChips = questionId
    ? [
        'Explain the step-by-step solution',
        'Why was my answer wrong?',
        'Which concept or formula did I miss?',
        'Give me a similar practice problem'
      ]
    : [
        'Explain why my score changed in Mock 8',
        'Why am I losing marks in Mathematics?',
        'Help me understand King’s Property in Integration',
        'Create a 2-hour daily study plan based on my weak topics',
        'Am I accurate but slow?',
        'Suggest a 3-round time management strategy'
      ];

  const loadMessages = async () => {
    const list = await aiCoachService.getMessages();
    setMessages(list);
  };

  useEffect(() => {
    loadMessages();
    aiCoachService.getCoachStatus().then(st => setCoachStatus(st));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputVal.trim();
    if (!text || isTyping) return;

    setInputVal('');
    setIsTyping(true);

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender: 'student',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      contextTopic: topicContext,
      questionId
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const { coachMsg } = await aiCoachService.sendMessage(text, {
        contextTopic: topicContext,
        questionId
      });
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempUserMsg.id);
        return [...filtered, tempUserMsg, coachMsg];
      });
    } catch (err) {
      console.error('Failed to get coach response:', err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = async () => {
    const fresh = await aiCoachService.clearChat();
    setMessages(fresh);
    setTopicContext(undefined);
    setQuestionId(undefined);
  };

  const clearContext = () => {
    setTopicContext(undefined);
    setQuestionId(undefined);
  };

  // Helper to render basic markdown formatting cleanly
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Heading level 3: ### Heading
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} style={{ fontSize: '14px', fontWeight: 700, margin: '8px 0 4px 0', color: 'var(--text-primary)' }}>
            {line.slice(4)}
          </h4>
        );
      }
      // Heading level 2: ## Heading
      if (line.startsWith('## ')) {
        return (
          <h3 key={idx} style={{ fontSize: '15px', fontWeight: 700, margin: '10px 0 6px 0', color: 'var(--text-primary)' }}>
            {line.slice(3)}
          </h3>
        );
      }

      // Format bold and backticks inline
      const formattedLine = line.split(/(\*\*.*?\*\*|`.*?`)/).map((part, partIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={partIdx}
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.06)',
                padding: '2px 5px',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '12px'
              }}
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      });

      return (
        <div key={idx} style={{ minHeight: line.trim() ? 'auto' : '8px', marginBottom: '2px' }}>
          {formattedLine}
        </div>
      );
    });
  };

  return (
    <div className="page-container" style={{ maxWidth: '1000px' }}>
      {/* Page Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              AI Performance Coach
            </h2>
            {coachStatus?.isLiveAiAvailable ? (
              <span
                className="badge badge-success"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                title={`Live generative AI connected via ${coachStatus.model}`}
              >
                <Sparkles size={12} />
                <span>Gemini 2.5 Flash (Live AI)</span>
              </span>
            ) : (
              <span
                className="badge badge-default"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                title="Running on local deterministic diagnostic heuristics. Configure GEMINI_API_KEY in backend/.env to activate live Google Gemini."
              >
                <Bot size={12} />
                <span>Offline Diagnostic Engine</span>
              </span>
            )}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Context-grounded pedagogical feedback, error diagnosis, and study guidance tailored to your verified mock data.
          </p>
        </div>

        <button
          onClick={handleClear}
          className="btn btn-secondary btn-sm"
          style={{ gap: '6px' }}
        >
          <RotateCcw size={14} />
          <span>Reset Conversation</span>
        </button>
      </div>

      {/* Active Context Banner (if question or topic active) */}
      {(questionId || topicContext) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            backgroundColor: 'var(--accent-blue-light)',
            border: '1px solid var(--accent-blue-border)',
            borderRadius: '6px',
            fontSize: '12px',
            color: 'var(--accent-blue)',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={16} />
            <span>
              Active Grounding Context:{' '}
              <strong>{questionId ? `Question #${questionId}` : topicContext}</strong>
            </span>
          </div>
          <button
            onClick={clearContext}
            style={{ color: 'var(--text-muted)', fontSize: '11px', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Clear Context
          </button>
        </div>
      )}

      {/* Chat Container */}
      <div
        className="card"
        style={{
          height: '560px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          marginBottom: '16px'
        }}
      >
        {/* Messages Scroll Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}
        >
          {messages.map(msg => {
            const isCoach = msg.sender === 'coach';

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  flexDirection: isCoach ? 'row' : 'row-reverse'
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: isCoach ? 'var(--accent-primary)' : '#e2e8f0',
                    color: isCoach ? '#ffffff' : 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {isCoach ? <Bot size={18} /> : <User size={18} />}
                </div>

                {/* Message Bubble */}
                <div style={{ maxWidth: '85%' }}>
                  <div
                    style={{
                      padding: '14px 18px',
                      borderRadius: '8px',
                      backgroundColor: isCoach ? 'var(--bg-surface)' : 'var(--accent-blue)',
                      color: isCoach ? 'var(--text-primary)' : '#ffffff',
                      border: isCoach ? '1px solid var(--border-default)' : 'none',
                      fontSize: '13px',
                      lineHeight: 1.6,
                      boxShadow: 'var(--shadow-xs)'
                    }}
                  >
                    <div>{renderFormattedText(msg.text)}</div>

                    {/* Disclaimer / Model tag for coach responses */}
                    {isCoach && (
                      <div
                        style={{
                          marginTop: '8px',
                          paddingTop: '6px',
                          borderTop: '1px solid var(--border-subtle)',
                          fontSize: '10px',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '6px'
                        }}
                      >
                        <span>
                          Engine: {msg.modelUsed || (msg.isSimulated ? 'Offline Diagnostic Engine' : 'Google Gemini 2.5 Flash')}
                        </span>
                        {msg.sourceSummary && <span>Grounding: {msg.sourceSummary}</span>}
                      </div>
                    )}

                    {isCoach && msg.disclaimer && (
                      <div style={{ fontSize: '10px', color: '#b45309', marginTop: '4px', fontStyle: 'italic' }}>
                        {msg.disclaimer}
                      </div>
                    )}

                    {/* Interactive Action Links inside coach message */}
                    {isCoach && msg.actionLinks && msg.actionLinks.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-default)' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                          Recommended Actions:
                        </span>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {msg.actionLinks.map((link, idx) => (
                            <button
                              key={idx}
                              onClick={() => onNavigate(link.page, link.context)}
                              className="btn btn-secondary btn-sm"
                              style={{
                                fontSize: '11px',
                                padding: '4px 10px',
                                gap: '4px',
                                color: 'var(--accent-blue)',
                                borderColor: 'var(--accent-blue-border)',
                                backgroundColor: 'var(--accent-blue-light)'
                              }}
                            >
                              <span>{link.label}</span>
                              <ExternalLink size={12} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginTop: '4px',
                      justifyContent: isCoach ? 'flex-start' : 'flex-end'
                    }}
                  >
                    <span>{msg.timestamp}</span>
                    {msg.questionId && <span>• Question: {msg.questionId}</span>}
                    {msg.contextTopic && <span>• Topic: {msg.contextTopic}</span>}
                  </div>

                  {/* Suggestion follow-up prompt buttons */}
                  {isCoach && msg.actionSuggestions && msg.actionSuggestions.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {msg.actionSuggestions.map((sug, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(sug)}
                          className="btn btn-secondary btn-sm"
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            backgroundColor: 'var(--bg-surface-subtle)',
                            borderColor: 'var(--border-default)'
                          }}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--accent-primary)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Bot size={18} />
              </div>
              <div
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-default)',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Sparkles size={14} className="animate-spin" color="var(--accent-primary)" />
                <span>Synthesizing student mock diagnostics & pedagogic solution...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Multiline Input Bar */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface)'
          }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <textarea
              placeholder="Ask AI Coach (e.g., 'Explain King's property in Integration' or 'Analyze my Mock 8 mistakes'). Press Enter to send, Shift+Enter for new line."
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="input-control"
              style={{
                flex: 1,
                resize: 'none',
                fontFamily: 'inherit',
                fontSize: '13px',
                padding: '8px 12px'
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputVal.trim() || isTyping}
              className="btn btn-primary"
              style={{ padding: '10px 18px', gap: '6px', height: '42px' }}
            >
              <span>Send</span>
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Lightbulb size={14} />
          <span>Recommended Discussion Prompts:</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {promptChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

