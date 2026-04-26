"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Logo } from "@/components/Logo";

export default function Home() {
  const { loading, session, previewMode } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(previewMode || session ? "/dashboard" : "/login");
  }, [loading, previewMode, session, router]);

  return (
    <div className="py-10">
      <Logo size="md" href="/login" />
      <p className="mt-3 text-sm text-slate-600">Redirecting…</p>
    </div>
  );
}
