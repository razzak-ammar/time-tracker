"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

interface LoginFormProps {
  onToggleMode: () => void;
}

export function LoginForm({ onToggleMode }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to sign in");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Welcome back
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Sign in to your account to continue
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label
            htmlFor="email"
            className="text-slate-700 dark:text-slate-300"
          >
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-10 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="text-slate-700 dark:text-slate-300"
          >
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-10 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        {error && (
          <Alert variant="destructive" className="border-red-200 dark:border-red-900">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button
          type="submit"
          className="h-11 w-full rounded-lg bg-slate-900 px-4 font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus-visible:ring-slate-400 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 dark:focus-visible:ring-slate-500"
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onToggleMode();
          }}
          className="cursor-pointer font-medium text-slate-900 underline-offset-2 hover:underline dark:text-white"
          aria-label="Switch to sign up"
        >
          Sign up
        </button>
      </p>
    </div>
  );
}
