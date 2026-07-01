'use client';
import clsx from 'clsx';
import FocusTrap from 'focus-trap-react';
import { BotMessageSquare, SendIcon, Trash2Icon, XIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { resolveFilePathToUrlPath } from '@/lib/resolve-link';

type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sources: string[];
  isStreaming?: boolean;
};

interface AiChatPanelProps {
  siteId: string;
}

export function AiChatPanel({ siteId }: AiChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const nextId = useRef(0);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length >= 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || isLoading) return;

    setInput('');
    setError(null);

    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, role: 'user', content: question, sources: [] },
    ]);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/sites/id/${siteId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history }),
      });

      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? 'AI Chat is not enabled for this site.'
            : `Request failed (${response.status})`,
        );
      }

      if (!response.body) throw new Error('No response body');

      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          role: 'assistant',
          content: '',
          sources: [],
          isStreaming: true,
        },
      ]);
      setIsLoading(false);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'token') {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role !== 'assistant') return prev;
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: last.content + data.content },
                ];
              });
            } else if (data.type === 'sources') {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role !== 'assistant') return prev;
                return [
                  ...prev.slice(0, -1),
                  { ...last, sources: data.paths, isStreaming: false },
                ];
              });
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      }

      // Ensure streaming flag is cleared even if sources event was missing
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.isStreaming) {
          return [...prev.slice(0, -1), { ...last, isStreaming: false }];
        }
        return prev;
      });
    } catch (err) {
      setIsLoading(false);
      // Remove empty assistant bubble if we added one before the error
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.isStreaming && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.',
      );
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Chat"
        className="ai-chat-toggle"
      >
        <BotMessageSquare className="ai-chat-toggle-icon" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              clickOutsideDeactivates: true,
              allowOutsideClick: true,
              fallbackFocus: () => panelRef.current ?? document.body,
            }}
          >
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="ai-chat-panel"
            >
              {/* Header */}
              <div className="ai-chat-header">
                <div className="ai-chat-header-title">
                  <BotMessageSquare className="ai-chat-header-icon" />
                  <span className="ai-chat-header-label">Ask AI</span>
                </div>
                <div className="ai-chat-header-actions">
                  {messages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setMessages([]);
                        setError(null);
                      }}
                      aria-label="Clear conversation"
                      className="ai-chat-icon-button"
                    >
                      <Trash2Icon className="ai-chat-icon-button-icon" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close AI Chat"
                    className="ai-chat-icon-button"
                  >
                    <XIcon className="ai-chat-icon-button-icon" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="ai-chat-messages">
                {messages.length === 0 && (
                  <div className="ai-chat-empty">
                    <BotMessageSquare className="ai-chat-empty-icon" />
                    <p className="ai-chat-empty-text">
                      Ask anything about this site&apos;s content.
                    </p>
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={clsx(
                      'ai-chat-message',
                      msg.role === 'user' ? 'is-user' : 'is-assistant',
                    )}
                  >
                    <div
                      className={clsx(
                        'ai-chat-bubble',
                        msg.role === 'user' ? 'is-user' : 'is-assistant',
                      )}
                    >
                      {msg.content}
                      {msg.isStreaming && (
                        <span className="ai-chat-streaming-cursor" />
                      )}
                    </div>

                    {msg.sources.length > 0 && (
                      <div className="ai-chat-sources">
                        {msg.sources.map((path) => (
                          <Link
                            key={path}
                            href={resolveFilePathToUrlPath({ target: path })}
                            className="ai-chat-source-link"
                          >
                            {path
                              .replace(/^\//, '')
                              .replace(/\.(md|mdx)$/, '')
                              .replace(/[-_]/g, ' ') || 'source'}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="ai-chat-loading">
                    <div className="ai-chat-loading-bubble">
                      <span className="ai-chat-loading-dots">
                        <span className="ai-chat-loading-dot" />
                        <span className="ai-chat-loading-dot" />
                        <span className="ai-chat-loading-dot" />
                      </span>
                    </div>
                  </div>
                )}

                {error && <div className="ai-chat-error">{error}</div>}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit} className="ai-chat-form">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e as unknown as React.FormEvent);
                    }
                  }}
                  placeholder="Ask a question… (Enter to send)"
                  rows={1}
                  disabled={isLoading}
                  className="ai-chat-input"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  aria-label="Send message"
                  className={clsx(
                    'ai-chat-submit',
                    !input.trim() || isLoading ? 'is-disabled' : 'is-active',
                  )}
                >
                  <SendIcon className="ai-chat-submit-icon" />
                </button>
              </form>
            </motion.div>
          </FocusTrap>
        )}
      </AnimatePresence>
    </>
  );
}
