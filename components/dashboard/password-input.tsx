'use client';

import clsx from 'clsx';
import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, InputHTMLAttributes, useId, useState } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
  helpText?: string;
  error?: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, Props>(
  (
    {
      label = 'Password',
      required = true,
      disabled,
      helpText,
      error,
      className,
      ...props
    },
    ref,
  ) => {
    const [show, setShow] = useState(false);
    const id = useId();
    const helpId = helpText ? `${id}-help` : undefined;
    const errId = error ? `${id}-err` : undefined;

    return (
      <div className="w-full max-w-md">
        {/* --slot defines equal top/bottom row min height */}
        <div className="min-h-30 grid grid-rows-[minmax(var(--slot),1fr)_auto_minmax(var(--slot),1fr)] gap-2 [--slot:1rem]">
          {/* Row 1: Label (vertically centered within its row) */}
          <label htmlFor={id} className="block self-end text-sm text-stone-700">
            {label}
          </label>

          {/* Row 2: Input (centered by row structure) */}
          <div className="relative self-center">
            <input
              id={id}
              ref={ref}
              type={show ? 'text' : 'password'}
              required={required}
              name="password"
              autoComplete="new-password"
              inputMode="text"
              spellCheck={false}
              disabled={disabled}
              className={clsx(
                'h-10 w-full rounded-md border border-stone-300 pr-10 text-sm text-stone-900 placeholder-stone-300 focus:border-stone-500 focus:outline-none focus:ring-stone-500',
                error &&
                  'border-red-400 focus:border-red-500 focus:ring-red-500',
                className,
              )}
              aria-invalid={!!error}
              aria-describedby={
                [helpId, errId].filter(Boolean).join(' ') || undefined
              }
              {...props}
            />

            {!disabled && (
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute inset-y-0 right-0 m-2 inline-flex items-center rounded p-1 text-stone-500 hover:text-stone-800"
                aria-label={show ? 'Hide password' : 'Show password'}
                aria-pressed={show}
              >
                {show ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            )}
          </div>

          <div className="self-start text-xs">
            {!error && helpText && (
              <p
                id={helpId}
                className="line-clamp-2 text-stone-500"
                title={helpText}
              >
                {helpText}
              </p>
            )}
            {error && (
              <p
                id={errId}
                className="line-clamp-2 text-red-600"
                aria-live="polite"
              >
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';
