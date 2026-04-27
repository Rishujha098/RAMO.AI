'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Logo } from '@/components/Logo';

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
      {children}
    </span>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path
        d="M4.5 7.5 12 13l7.5-5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.75 6.25h10.5A2.75 2.75 0 0 1 20 9v8a2.75 2.75 0 0 1-2.75 2.75H6.75A2.75 2.75 0 0 1 4 17V9a2.75 2.75 0 0 1 2.75-2.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path
        d="M8.5 10V8.25a3.5 3.5 0 0 1 7 0V10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7.5 10h9A2.5 2.5 0 0 1 19 12.5v5A2.5 2.5 0 0 1 16.5 20h-9A2.5 2.5 0 0 1 5 17.5v-5A2.5 2.5 0 0 1 7.5 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 14v2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path
        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10.6 10.6A3.25 3.25 0 0 0 13.4 13.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6.3 6.9C4.2 8.4 2.8 10.6 2.5 12c.8 2.1 4.1 7 9.5 7 1.8 0 3.4-.5 4.8-1.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.7 5.3A10.1 10.1 0 0 1 12 5c6 0 9.5 7 9.5 7-.5 1.1-1.6 3-3.4 4.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path
        d="M20.5 12.2c0 5-3.4 8.3-8.5 8.3A8.5 8.5 0 1 1 12 3.5c2.3 0 4.2.9 5.7 2.3l-2.3 2.3A4.9 4.9 0 0 0 12 6.7a5.3 5.3 0 1 0 0 10.6c2.6 0 3.9-1.5 4.1-3.2H12v-3h8.3c.1.5.2 1 .2 1.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IllustrationPanel() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-slate-100">
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-200/40 blur-2xl" />
      <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-slate-200/60 blur-2xl" />

      <div className="relative flex h-full items-center justify-center p-8">
        <div className="w-full max-w-sm rounded-3xl bg-white/70 p-6 ring-1 ring-slate-200/70 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-700">Your AI Interview Coach</div>
            <div className="rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold text-blue-700">
              Live
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 p-1">
              <div className="h-full w-full rounded-2xl bg-white/90" />
              <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                <span className="h-2 w-2 rounded-full bg-blue-600" />
              </div>
              <div className="absolute left-1/2 top-2/3 h-1 w-6 -translate-x-1/2 rounded-full bg-blue-200" />
            </div>
            <div className="flex-1">
              <div className="text-base font-semibold">Resume • Questions • Feedback</div>
              <div className="mt-1 text-sm text-slate-600">Practice with confidence scoring and a final report.</div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {['Resume', 'Questions', 'Feedback', 'Progress'].map((t) => (
              <div key={t} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/70">
                <div className="text-sm font-medium text-slate-700">{t}</div>
                <div className="h-2 w-24 rounded-full bg-slate-100">
                  <div className="h-2 w-14 rounded-full bg-blue-600" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { session, previewMode } = useAuth();

  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) router.replace('/dashboard');
  }, [session, router]);

  async function signInWithGoogle() {
    setNotice(null);
    setError(null);
    setLoading(true);
    try {
      if (previewMode) {
        router.replace('/dashboard');
        return;
      }

      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (err) throw err;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function signIn() {
    setNotice(null);
    setError(null);
    setLoading(true);
    try {
      if (previewMode) {
        router.replace('/dashboard');
        return;
      }

      const emailValue = email.trim();
      const { error: err } = await supabase.auth.signInWithPassword({ email: emailValue, password });
      if (err) throw err;
      router.replace('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function signUp() {
    setNotice(null);
    setError(null);
    setLoading(true);
    try {
      if (previewMode) {
        router.replace('/dashboard');
        return;
      }

      const emailValue = email.trim();
      const { data, error: err } = await supabase.auth.signUp({
        email: emailValue,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (err) throw err;

      if (!data.session) {
        setNotice('Account created. Check your email to confirm, then sign in.');
        setMode('sign-in');
        return;
      }

      router.replace('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function forgotPassword() {
    setNotice(null);
    setError(null);
    if (previewMode) {
      setNotice('Preview mode: password reset is disabled.');
      return;
    }
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (err) throw err;
      setNotice('Password reset email sent (if the account exists).');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const primaryAction = mode === 'sign-in' ? signIn : signUp;
  const primaryLabel = mode === 'sign-in' ? 'Sign In' : 'Sign Up';
  const secondaryPrompt = mode === 'sign-in' ? "Don't have an account?" : 'Already have an account?';
  const secondaryActionLabel = mode === 'sign-in' ? 'Sign Up' : 'Sign In';

  return (
    <div className="min-h-dvh px-4 py-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="overflow-hidden rounded-3xl bg-white/70 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 md:p-10">
              <Logo size="lg" href="/login" />

              <div className="mt-6">
                <h1 className="text-3xl font-semibold tracking-tight">Welcome to RAMO.AI</h1>
                <p className="mt-2 text-sm text-slate-600">
                  {previewMode
                    ? 'Preview mode is enabled — authentication is disabled so you can review the UI.'
                    : 'Sign in to start your interview preparation'}
                </p>
              </div>

              <div className="mt-8 space-y-4">
                <div className="relative">
                  <FieldIcon>
                    <MailIcon />
                  </FieldIcon>
                  <input
                    className="h-12 w-full rounded-full border border-slate-200 bg-white px-12 text-sm outline-none ring-blue-600/20 placeholder:text-slate-400 focus:ring-4"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>

                <div className="relative">
                  <FieldIcon>
                    <LockIcon />
                  </FieldIcon>
                  <input
                    className="h-12 w-full rounded-full border border-slate-200 bg-white px-12 pr-12 text-sm outline-none ring-blue-600/20 placeholder:text-slate-400 focus:ring-4"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>

                {notice ? (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    {notice}
                  </div>
                ) : null}

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void primaryAction()}
                  className="h-12 w-full rounded-full bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {primaryLabel}
                </button>

                {mode === 'sign-in' ? (
                  <div className="text-center">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void forgotPassword()}
                      className="text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50"
                    >
                      Forgot Password?
                    </button>
                  </div>
                ) : null}

                <div className="flex items-center gap-3 py-2">
                  <div className="h-px flex-1 bg-slate-200" />
                  <div className="text-xs font-medium text-slate-500">OR</div>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void signInWithGoogle()}
                  className="h-12 w-full rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <span className="flex items-center justify-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-700">
                      <GoogleIcon />
                    </span>
                    Continue with Google
                  </span>
                </button>

                <div className="pt-2 text-center text-sm text-slate-600">
                  <button type="button" className="hover:text-slate-900" onClick={() => setMode((m) => (m === 'sign-in' ? 'sign-up' : 'sign-in'))}>
                    {secondaryPrompt} <span className="font-semibold text-blue-700">{secondaryActionLabel}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="hidden md:block">
              <IllustrationPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
