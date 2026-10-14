"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type Mode = "login" | "reset";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    if (signInError) { setError("Incorrect email or password. Please try again."); return; }
    const redirectTo = searchParams.get("redirectTo") || "/dashboard";
    router.push(redirectTo);
    router.refresh();
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    setIsLoading(false);
    if (resetError) { setError("Could not send reset email. Check the address and try again."); return; }
    setSuccess("Password reset link sent — check your email.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <h1 className="font-heading text-xl font-semibold">M'Kayla City ApartHotel</h1>
          <p className="mt-1 text-sm text-muted">
            {mode === "login" ? "Sign in to the staff console" : "Reset your password"}
          </p>
          {mode === "login" ? (
            <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Password</label>
                <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
              <Button type="submit" disabled={isLoading} className="mt-2">
                {isLoading ? "Signing in…" : "Sign in"}
              </Button>
              <button type="button" onClick={() => { setMode("reset"); setError(null); }}
                className="text-center text-xs text-muted hover:text-accent">
                Forgot password?
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="mt-6 flex flex-col gap-4">
              <div>
                <label htmlFor="reset-email" className="mb-1.5 block text-sm font-medium">Your email address</label>
                <Input id="reset-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
              {success && <p className="text-sm text-success">{success}</p>}
              <Button type="submit" disabled={isLoading || !!success} className="mt-2">
                {isLoading ? "Sending…" : "Send reset link"}
              </Button>
              <button type="button" onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
                className="text-center text-xs text-muted hover:text-accent">
                Back to sign in
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted">Loading…</p>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
