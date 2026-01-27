'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Loader2, 
  Bot, 
  User,
  Sparkles,
  ChevronDown,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { getFullKnowledgeBase, searchKnowledgeBase } from '@/lib/league-knowledge-base';
import { getApiKeyAsync } from '@/lib/openai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_QUESTIONS = [
  "How many games per week do I need to play?",
  "What are the trading rules?",
  "How does the IL work?",
  "How do I report game scores?",
  "What happens if I'm inactive?",
];

export default function LeagueAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hey! 👋 I'm your JKAP League Assistant. I can answer questions about league rules, trading policies, IL rules, and more. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async (questionText?: string) => {
    const text = questionText || input.trim();
    if (!text || isLoading) return;

    setShowQuickQuestions(false);
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Get API key
      const apiKey = await getApiKeyAsync();
      
      if (!apiKey) {
        // Fallback to local search if no API key
        const relevantRules = searchKnowledgeBase(text);
        
        let response = "Based on the league rules:\n\n";
        if (relevantRules.length > 0) {
          response = relevantRules.map(rule => 
            `**${rule.title}**\n${rule.content}`
          ).join('\n\n---\n\n');
        } else {
          response = "I couldn't find specific information about that. Try asking about:\n- Trading rules\n- IL (injured list) policies\n- Activity requirements\n- Game reporting\n\nOr contact the commissioner for help!";
        }
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
        return;
      }

      // Use OpenAI with the knowledge base
      const knowledgeBase = getFullKnowledgeBase();
      
      const systemPrompt = `You are the JKAP Memorial League Assistant, a helpful AI that answers questions about the league rules and policies.

IMPORTANT RULES:
1. Only answer questions based on the knowledge base provided below
2. Be friendly and helpful
3. Keep answers concise but complete
4. If you don't know something, say so and suggest contacting the commissioner
5. Use bullet points and formatting for clarity
6. Always be encouraging and welcoming

LEAGUE KNOWLEDGE BASE:
${knowledgeBase}

Remember: You are answering for a competitive MLB The Show online league. Be helpful and accurate!`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: text },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const assistantContent = data.choices[0]?.message?.content || "I'm having trouble answering that. Please try again!";

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Assistant error:', error);
      
      // Fallback to local search
      const relevantRules = searchKnowledgeBase(text);
      let response = "";
      
      if (relevantRules.length > 0) {
        response = relevantRules.map(rule => 
          `**${rule.title}**\n${rule.content}`
        ).join('\n\n');
      } else {
        response = "I'm having trouble connecting right now. For help with league rules, check the Documents page or contact the commissioner on Discord!";
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Format message content with basic markdown
  const formatMessage = (content: string) => {
    return content
      .split('\n')
      .map((line, i) => {
        // Bold
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Bullet points
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return `<li key="${i}" class="ml-4">${line.substring(2)}</li>`;
        }
        // Numbered lists
        const numMatch = line.match(/^(\d+)\.\s(.*)$/);
        if (numMatch) {
          return `<li key="${i}" class="ml-4">${numMatch[2]}</li>`;
        }
        return line;
      })
      .join('<br/>');
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center z-50 group"
          title="League Assistant"
        >
          <MessageSquare className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-2.5 h-2.5 text-white" />
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[32rem] bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">League Assistant</h3>
                <p className="text-xs text-amber-100">Ask me anything!</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' 
                    ? 'bg-blue-500' 
                    : 'bg-gradient-to-r from-amber-500 to-orange-600'
                }`}>
                  {message.role === 'user' 
                    ? <User className="w-4 h-4 text-white" />
                    : <Bot className="w-4 h-4 text-white" />
                  }
                </div>
                <div className={`max-w-[80%] p-3 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-slate-700 text-slate-100 rounded-tl-sm'
                }`}>
                  <div 
                    className="text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                  />
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-slate-700 text-slate-100 p-3 rounded-2xl rounded-tl-sm">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {showQuickQuestions && messages.length <= 1 && (
            <div className="px-4 pb-2">
              <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                Quick questions:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_QUESTIONS.slice(0, 3).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="text-xs px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-full transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-slate-700">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about league rules..."
                className="flex-1 px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 text-sm"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-center text-xs text-slate-500 mt-2">
              Powered by JKAP Knowledge Base
            </p>
          </div>
        </div>
      )}
    </>
  );
}
