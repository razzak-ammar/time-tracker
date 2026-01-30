"use client";

import { useState, useEffect } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Loader2, Clock } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex min-h-screen flex-col md:flex-row">
      {/* Left panel — branding (hidden on small screens, optional on tablet) */}
      <div className="hidden w-full flex-col justify-between bg-slate-900 p-8 text-white md:flex md:max-w-[420px] lg:max-w-[480px]">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 20V40H20'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
            <Clock className="h-5 w-5 text-slate-300" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            TimeTracker
          </span>
        </div>
        <div className="relative space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight text-white lg:text-3xl">
            Track time.
            <br />
            Get things done.
          </h1>
          <p className="max-w-sm text-slate-400">
            Log hours by project, see where your time goes, and stay on top of
            deadlines.
          </p>
        </div>
        <div className="relative text-xs text-slate-500">
          Sign in to continue to your dashboard.
        </div>
      </div>

      {/* Right panel — half-page overlay + form */}
      <div className="relative flex flex-1 flex-col">
        {/* Full-height overlay for contrast (right half of screen) */}
        <div
          className="absolute inset-0 z-0 border-l border-slate-200/80 bg-white dark:border-slate-700/80 dark:bg-slate-900"
          aria-hidden
        />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12">
          <div className="flex items-center gap-3 md:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800">
              <Clock className="h-4 w-4 text-slate-300" />
            </div>
            <span className="text-base font-semibold text-slate-900 dark:text-white">
              TimeTracker
            </span>
          </div>
          <div className="mt-8 w-full max-w-[360px] md:mt-0">
            {isLogin ? (
              <LoginForm onToggleMode={() => setIsLogin(false)} />
            ) : (
              <SignUpForm onToggleMode={() => setIsLogin(true)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
