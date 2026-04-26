'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { loading, session, previewMode } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !previewMode && !session) {
      router.replace('/login');
    }
  }, [loading, previewMode, session, router]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!previewMode && !session) return <div className="p-6">Redirecting...</div>;
  return <>{children}</>;
}
