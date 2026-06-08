'use client';
import FocusTrap from 'focus-trap-react';
import { BotMessageSquare, SendIcon, Trash2Icon, XIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { resolveFilePathToUrlPath } from '@/lib/resolve-link';
import { cn } from '@/lib/utils';

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
        className="fixed bottom-20 right-8 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
      >
        <BotMessageSquare className="h-5 w-5" />
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
              className={cn(
                'fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl',
                // Desktop: anchored above the button
                'bottom-36 right-8 h-[480px] w-[360px]',
                // Mobile: full-width sheet from bottom
                'max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:h-[70dvh] max-sm:w-full max-sm:rounded-b-none',
              )}
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-stone-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <BotMessageSquare className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-semibold text-stone-800">
                    Ask AI
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setMessages([]);
                        setError(null);
                      }}
                      aria-label="Clear conversation"
                      className="rounded-md p-1 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close AI Chat"
                    className="rounded-md p-1 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center text-center text-stone-400">
                    <BotMessageSquare className="mb-3 h-8 w-8" />
                    <p className="text-sm">
                      Ask anything about this site&apos;s content.
                    </p>
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex flex-col gap-1.5',
                      msg.role === 'user' ? 'items-end' : 'items-start',
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed',
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-stone-100 text-stone-800',
                      )}
                    >
                      {msg.content}
                      {msg.isStreaming && (
                        <span className="ml-1 inline-block h-2 w-2 animate-pulse rounded-full bg-stone-400" />
                      )}
                    </div>

                    {msg.sources.length > 0 && (
                      <div className="flex max-w-[85%] flex-wrap gap-1">
                        {msg.sources.map((path) => (
                          <Link
                            key={path}
                            href={resolveFilePathToUrlPath({ target: path })}
                            className="rounded-full border border-stone-200 px-2 py-0.5 text-xs text-stone-500 transition-colors hover:border-indigo-300 hover:text-indigo-600"
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
                  <div className="flex items-start">
                    <div className="rounded-2xl bg-stone-100 px-3 py-2.5">
                      <span className="flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.3s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.15s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-stone-400" />
                      </span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                    {error}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form
                onSubmit={handleSubmit}
                className="flex shrink-0 items-end gap-2 border-t border-stone-200 p-3"
              >
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
                  className="flex-1 resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  aria-label="Send message"
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors focus:outline-none',
                    !input.trim() || isLoading
                      ? 'cursor-not-allowed bg-stone-100 text-stone-300'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700',
                  )}
                >
                  <SendIcon className="h-4 w-4" />
                </button>
              </form>
            </motion.div>
          </FocusTrap>
        )}
      </AnimatePresence>
    </>
  );
}
