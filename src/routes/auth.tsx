import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
  },
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. You can sign in now.");
        setMode("signin");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/auth/reset-password",
        });
        if (error) throw error;
        setSentTo(email);
        toast.success("Check your email — we've sent a reset link.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  const title =
    mode === "signin" ? "Sign in" : mode === "signup" ? "Create your account" : "Reset password";

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">VANI</div>
          <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "forgot"
              ? "Enter your email and we'll send you a reset link."
              : "Voice-AI control plane for D2C teams."}
          </p>
        </div>

        {mode === "forgot" && sentTo ? (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-muted/40 p-4 text-sm">
              We sent a password reset link to <span className="font-medium">{sentTo}</span>.
              Check your inbox and follow the link to set a new password.
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSentTo(null);
                setMode("signin");
              }}
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                      onClick={() => setMode("forgot")}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading
                ? "Working…"
                : mode === "signin"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create account"
                    : "Send reset link"}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" && (
            <>
              No account?{" "}
              <button
                className="text-foreground underline underline-offset-2"
                onClick={() => setMode("signup")}
              >
                Create one
              </button>
            </>
          )}
          {mode === "signup" && (
            <>
              Already have one?{" "}
              <button
                className="text-foreground underline underline-offset-2"
                onClick={() => setMode("signin")}
              >
                Sign in
              </button>
            </>
          )}
          {mode === "forgot" && !sentTo && (
            <button
              className="text-foreground underline underline-offset-2"
              onClick={() => setMode("signin")}
            >
              Back to sign in
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
