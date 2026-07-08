'use client';

import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import LoadingDots from '@/components/icons/loading-dots';

// Basic email shape check — good enough for client-side feedback.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (value: string) => EMAIL_REGEX.test(value.trim());

// Map NextAuth error codes (passed in the URL as ?error=) to friendly messages.
const ERROR_MESSAGES: Record<string, string> = {
  Verification:
    'This sign-in link has expired or has already been used. Please request a new one.',
  EmailSignin:
    'We could not send the sign-in email. Please try again in a moment.',
};

export default function LoginButton() {
  const [githubLoading, setGithubLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const emailIsValid = isValidEmail(email);
  const showEmailError = emailTouched && !emailIsValid;

  // Get error message added by next/auth in URL.
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');
  const callbackUrl = searchParams?.get('callbackUrl');

  useEffect(() => {
    const errorCode = Array.isArray(error) ? error.pop() : error;
    if (errorCode) {
      toast.error(ERROR_MESSAGES[errorCode] ?? errorCode);
    }
  }, [error]);

  const isLoading = githubLoading || googleLoading || emailLoading;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    if (!emailIsValid) return;

    setEmailLoading(true);
    try {
      const res = await signIn('email', {
        email,
        redirect: false,
        callbackUrl: callbackUrl || '/',
      });

      if (res?.error) {
        toast.error(ERROR_MESSAGES[res.error] ?? res.error);
      } else {
        setLinkSent(true);
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  if (linkSent) {
    return (
      <div className="space-y-3 text-center">
        <h2 className="font-dashboard-heading text-lg">Check your inbox</h2>
        <p className="text-sm text-stone-600">
          We&apos;ve sent a sign-in link to{' '}
          <span className="font-medium">{email}</span>. Click the link in that
          email to sign in. It may take a minute to arrive.
        </p>
        <button
          type="button"
          onClick={() => setLinkSent(false)}
          className="text-sm font-medium underline hover:text-primary-subtle"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        disabled={isLoading}
        onClick={() => {
          setGithubLoading(true);
          signIn('github', { callbackUrl: callbackUrl || '/' });
        }}
        className={`${
          isLoading
            ? 'cursor-not-allowed bg-stone-50 '
            : 'bg-white hover:bg-stone-50 active:bg-stone-100   '
        } group flex h-10 w-full items-center justify-center space-x-2 rounded-md border border-stone-200 transition-colors duration-75 focus:outline-none `}
      >
        {githubLoading ? (
          <LoadingDots color="#A8A29E" />
        ) : (
          <>
            <svg
              className="h-4 w-4 text-black "
              aria-hidden="true"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <p className="text-sm font-medium text-stone-600 ">
              Continue with GitHub
            </p>
          </>
        )}
      </button>

      <button
        disabled={isLoading}
        onClick={() => {
          setGoogleLoading(true);
          signIn('google', { callbackUrl: callbackUrl || '/' });
        }}
        className={`${
          isLoading
            ? 'cursor-not-allowed bg-stone-50 '
            : 'bg-white hover:bg-stone-50 active:bg-stone-100   '
        } group flex h-10 w-full items-center justify-center space-x-2 rounded-md border border-stone-200 transition-colors duration-75 focus:outline-none `}
      >
        {googleLoading ? (
          <LoadingDots color="#A8A29E" />
        ) : (
          <>
            <svg className="h-4 w-4" aria-hidden="true" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <p className="text-sm font-medium text-stone-600 ">
              Continue with Google
            </p>
          </>
        )}
      </button>

      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-stone-200" />
        <span className="text-xs uppercase text-stone-400">or</span>
        <div className="h-px flex-1 bg-stone-200" />
      </div>

      <form onSubmit={handleEmailSubmit} noValidate className="space-y-3">
        <div className="space-y-1">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailTouched(false);
            }}
            disabled={isLoading}
            placeholder="Enter your email"
            aria-invalid={showEmailError}
            className={`h-10 w-full rounded-md border px-3 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-stone-50 ${
              showEmailError
                ? 'border-red-400 focus:border-red-500'
                : 'border-stone-200 focus:border-stone-400'
            }`}
          />
          {showEmailError && (
            <p className="text-xs text-red-500">
              Please enter a valid email address.
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading || !email.trim()}
          className={`${
            isLoading || !email.trim()
              ? 'cursor-not-allowed bg-stone-200 '
              : 'bg-black hover:bg-stone-800 active:bg-stone-700   '
          } group flex h-10 w-full items-center justify-center space-x-2 rounded-md border border-transparent transition-colors duration-75 focus:outline-none `}
        >
          {emailLoading ? (
            <LoadingDots color="#A8A29E" />
          ) : (
            <p
              className={`text-sm font-medium ${
                email.trim() ? 'text-white' : 'text-stone-400'
              }`}
            >
              Continue
            </p>
          )}
        </button>
      </form>
    </div>
  );
}
