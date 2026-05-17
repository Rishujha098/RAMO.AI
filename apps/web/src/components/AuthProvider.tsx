'use client';

import type { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { publicEnv } from '@/lib/env';

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  accessToken: string | null;
  userId: string | null;
  isAdmin: boolean;
  previewMode: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (publicEnv.previewMode) {
      setSession(null);
      setIsAdmin(true);
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchAdminStatus = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (mounted && !error && data) {
          setIsAdmin(Boolean(data.is_admin));
        }
      } catch (err) {
        console.error('Error fetching admin status:', err);
      }
    };

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session ?? null);
        if (data.session?.user) {
          fetchAdminStatus(data.session.user.id);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setSession(null);
        setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        fetchAdminStatus(newSession.user.id);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const accessToken = publicEnv.previewMode ? 'preview-token' : session?.access_token ?? null;
    const userId = publicEnv.previewMode ? 'preview-user' : session?.user?.id ?? null;
    return { loading, session, accessToken, userId, isAdmin, previewMode: publicEnv.previewMode };
  }, [loading, session, isAdmin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
