'use client';
import { useEffect, useRef, useState } from 'react';

type Props = React.PropsWithChildren;

export default function Pre({ children }: Props) {
  const preRef = useRef<HTMLPreElement | null>(null);
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const onCopy = async () => {
    const text = preRef.current?.innerText?.replace(/\n$/, '') ?? '';
    if (!text) return;

    const markCopied = () => {
      setCopied(true);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
    };

    try {
      await navigator.clipboard.writeText(text);
      markCopied();
    } catch {
      // Fallback
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        markCopied();
      } catch {
        // Optionally toast here
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="pre-container">
      <button
        aria-label="Copy code"
        type="button"
        className="pre-copy-button"
        data-copied={copied ? 'true' : 'false'}
        onClick={onCopy}
      >
        <svg
          aria-hidden="true"
          viewBox="-2 -2 20 20"
          fill="currentColor"
          className="pre-icon"
        >
          {copied ? (
            <path
              fillRule="evenodd"
              d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"
            />
          ) : (
            <>
              <path
                fillRule="evenodd"
                d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"
              />
              <path
                fillRule="evenodd"
                d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"
              />
            </>
          )}
        </svg>
      </button>

      <span aria-live="polite" className="pre-sr">
        {copied ? 'Code copied to clipboard' : ''}
      </span>

      <pre ref={preRef}>{children}</pre>
    </div>
  );
}
