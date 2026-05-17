'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabase';

export function RequireAuth({
  children,
  skipOnboarding,
  adminOnly,
}: {
  children: React.ReactNode;
  skipOnboarding?: boolean;
  adminOnly?: boolean;
}) {
  const { loading, session, previewMode, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    if (!loading && !previewMode && !session) {
      router.replace('/login');
    }
  }, [loading, previewMode, session, router]);

  useEffect(() => {
    if (!loading && !previewMode && session && adminOnly && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [loading, previewMode, session, adminOnly, isAdmin, router]);

  useEffect(() => {
    if (loading) return;
    if (previewMode) {
      setOnboardingChecked(true);
      return;
    }
    if (!session) {
      setOnboardingChecked(false);
      return;
    }
    if (skipOnboarding) {
      setOnboardingChecked(true);
      return;
    }
    if (pathname === '/onboarding') {
      setOnboardingChecked(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (cancelled) return;

        const completed = !error && Boolean(data?.onboarding_completed);
        if (!completed) {
          router.replace('/onboarding');
          return;
        }
        setOnboardingChecked(true);
      } catch {
        if (cancelled) return;
        router.replace('/onboarding');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, previewMode, session, skipOnboarding, pathname, router]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!previewMode && !session) return <div className="p-6">Redirecting...</div>;
  if (!previewMode && session && !skipOnboarding && pathname !== '/onboarding' && !onboardingChecked) {
    return <div className="p-6">Loading...</div>;
  }
  return <>{children}</>;
}
