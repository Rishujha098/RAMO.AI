'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Logo } from '@/components/Logo';

type Persona = 'student' | 'professional';

function coercePersona(value: unknown): Persona | '' {
  if (value === 'student' || value === 'professional') return value;
  return '';
}

function deriveNameFromMetadata(metadata: Record<string, unknown> | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const given = typeof metadata?.given_name === 'string' ? metadata.given_name.trim() : '';
  const family = typeof metadata?.family_name === 'string' ? metadata.family_name.trim() : '';
  if (given || family) {
    return { firstName: given, lastName: family };
  }

  const full =
    (typeof metadata?.full_name === 'string' ? metadata.full_name : '') ||
    (typeof metadata?.name === 'string' ? metadata.name : '');

  const normalized = full.trim().replace(/\s+/g, ' ');
  if (!normalized) return { firstName: '', lastName: '' };

  const parts = normalized.split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export default function OnboardingPage() {
  const router = useRouter();
  const { session, previewMode } = useAuth();

  const email = session?.user?.email ?? '';
  const derived = useMemo(() => deriveNameFromMetadata(session?.user?.user_metadata ?? null), [session]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState<string>('');
  const [persona, setPersona] = useState<Persona | ''>('');
  const [consentAccepted, setConsentAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (previewMode) router.replace('/dashboard');
  }, [previewMode, router]);

  useEffect(() => {
    if (!session || previewMode) {
      setBootstrapping(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setError(null);
      try {
        const { data, error: loadError } = await supabase
          .from('profiles')
          .select('first_name,last_name,age,persona,consent_accepted,onboarding_completed')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (cancelled) return;

        if (loadError) throw loadError;

        if (data?.onboarding_completed) {
          router.replace('/dashboard');
          return;
        }

        const nextFirst = (data?.first_name ?? '').trim() || derived.firstName;
        const nextLast = (data?.last_name ?? '').trim() || derived.lastName;
        setFirstName(nextFirst);
        setLastName(nextLast);
        setAge(typeof data?.age === 'number' ? String(data.age) : '');
        setPersona(coercePersona(data?.persona));
        setConsentAccepted(Boolean(data?.consent_accepted));
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (cancelled) return;
        setBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [derived.firstName, derived.lastName, previewMode, router, session]);

  async function submit() {
    setError(null);

    const first = firstName.trim();
    const last = lastName.trim();
    const ageValue = Number(age);

    if (!first) {
      setError('Please enter your first name.');
      return;
    }
    if (!last) {
      setError('Please enter your last name.');
      return;
    }
    if (!Number.isFinite(ageValue) || ageValue < 10 || ageValue > 120) {
      setError('Please enter a valid age.');
      return;
    }
    if (!persona) {
      setError('Please select Student or Professional.');
      return;
    }
    if (!consentAccepted) {
      setError('Please accept the consent to continue.');
      return;
    }
    if (!session) {
      setError('You are not logged in.');
      return;
    }

    setLoading(true);
    try {
      const fullName = `${first} ${last}`.trim();
      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: first,
          last_name: last,
          name: fullName,
          age: ageValue,
          persona,
          consent_accepted: true,
          consent_accepted_at: now,
          onboarding_completed: true,
        })
        .eq('user_id', session.user.id);

      if (updateError) throw updateError;

      router.replace('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequireAuth skipOnboarding>
      <div className="min-h-dvh px-4 py-10">
        <div className="mx-auto w-full max-w-2xl">
          <div className="rounded-3xl bg-white/70 p-8 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
            <Logo size="md" href="/dashboard" />

            <div className="mt-6">
              <h1 className="text-2xl font-semibold tracking-tight">Complete your profile</h1>
              <p className="mt-2 text-sm text-slate-600">
                This helps us personalize your interview experience.
              </p>
            </div>

            {bootstrapping ? <div className="mt-6 text-sm text-slate-600">Loading…</div> : null}

            {!bootstrapping ? (
              <div className="mt-6 space-y-4">
                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">First name</label>
                    <input
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none ring-blue-600/20 focus:ring-4"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={loading}
                      autoComplete="given-name"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Last name</label>
                    <input
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none ring-blue-600/20 focus:ring-4"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={loading}
                      autoComplete="family-name"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
                  <input
                    className="h-12 w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none"
                    value={email}
                    readOnly
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Age</label>
                    <input
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none ring-blue-600/20 focus:ring-4"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      disabled={loading}
                      inputMode="numeric"
                      placeholder="e.g. 21"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">You are</label>
                    <select
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none ring-blue-600/20 focus:ring-4"
                      value={persona}
                      onChange={(e) => setPersona(coercePersona(e.target.value))}
                      disabled={loading}
                    >
                      <option value="">Select</option>
                      <option value="student">Student</option>
                      <option value="professional">Professional</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                    checked={consentAccepted}
                    onChange={(e) => setConsentAccepted(e.target.checked)}
                    disabled={loading}
                  />
                  <span>
                    I consent to RAMO.AI storing and processing my information to personalize my interview practice.
                  </span>
                </label>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void submit()}
                  className="h-12 w-full rounded-full bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving…' : 'Continue'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
