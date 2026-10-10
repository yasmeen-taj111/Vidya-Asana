import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, X, Send, Bot, User as UserIcon, Sparkles } from 'lucide-react';
import { chatApi } from '../api/chat';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  suggestedActions?: {
    label: string;
    type: 'NAVIGATE' | 'BOOK';
    payload: Record<string, unknown>;
  }[];
}

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'bot',
      text: "Namaste! I'm Vidya Bot, your AI assistant. Need help finding a seat, studying, or understanding library rules?",
      suggestedActions: [
        { label: 'Find a seat', type: 'NAVIGATE', payload: { path: '/app/discover' } },
        { label: 'Pomodoro timer', type: 'NAVIGATE', payload: { path: '/app/study' } },
        { label: 'Best libraries', type: 'NAVIGATE', payload: { path: '/app/discover' } },
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await chatApi.sendMessage(query);
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: res.reply,
        suggestedActions: res.suggestedActions,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: "I'm temporarily having trouble connecting. Feel free to browse seats directly from the Discover tab!",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (action: { label: string; type: string; payload: Record<string, unknown> }) => {
    if (action.type === 'NAVIGATE' && typeof action.payload.path === 'string') {
      const raw = action.payload.path;
      const target = raw.startsWith('/app') || !raw.startsWith('/') ? raw : `/app${raw}`;
      navigate(target);
      setIsOpen(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3.5 rounded-full bg-primary hover:bg-primary-hover text-white font-medium shadow-xl shadow-primary/25 transition-all transform hover:scale-105"
          aria-label="Open AI Assistant"
        >
          <Sparkles className="w-5 h-5 text-accent animate-spin-slow" />
          <span className="text-sm">Ask Vidya AI</span>
          <MessageSquare className="w-4 h-4 ml-1" />
        </button>
      )}

      {isOpen && (
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-80 sm:w-96 h-[500px] flex flex-col overflow-hidden animate-scale-up">
          {/* Header */}
          <div className="bg-navy px-5 py-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                <Bot className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h4 className="font-semibold text-sm leading-none">Vidya Asana AI</h4>
                <span className="text-[11px] text-slate-300 flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Always active & ready
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div className="max-w-[80%] space-y-2">
                  <div
                    className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                      m.sender === 'user'
                        ? 'bg-primary text-white rounded-tr-none'
                        : 'bg-white text-slate-800 border border-slate-100 shadow-sm rounded-tl-none'
                    }`}
                  >
                    {m.text}
                  </div>

                  {m.suggestedActions && m.suggestedActions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {m.suggestedActions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => handleActionClick(act)}
                          className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-primary hover:text-white text-primary border border-primary/20 rounded-full transition-all shadow-sm"
                        >
                          {act.label} →
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {m.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-1">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5 items-center text-slate-400 text-xs py-2">
                <Bot className="w-4 h-4 animate-bounce" />
                <span>Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-slate-100 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about seats, rules..."
              className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl bg-slate-100 border border-transparent focus:border-primary focus:bg-white outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 bg-primary text-white rounded-xl disabled:opacity-40 hover:bg-primary-hover transition-colors shrink-0 shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
