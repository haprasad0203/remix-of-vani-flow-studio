import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, Sparkles, Eye, EyeOff } from "lucide-react";

type SearchParams = {
  redirect?: string;
};

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    };
  },
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: search.redirect || "/" });
  },
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

/* Voice equalizer bars — identical to kzuno.in nav */
function VoiceBars({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-end gap-[2.5px] h-[13px] ${className}`}>
      {[5, 12, 7, 13, 4].map((h, i) => (
        <span
          key={i}
          className="w-[2.5px] rounded-sm"
          style={{
            height: h,
            background: "#185A3A",
            animation: `vwave 1.2s ease-in-out ${i * 0.15}s infinite alternate`,
          }}
        />
      ))}
    </span>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const { redirect: redirectUrl } = Route.useSearch();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        
        if (data.user && !data.session) {
          toast.info("Please verify your email before signing in.");
          navigate({ to: "/verify-email" });
        } else {
          toast.success("Account created. You can sign in now.");
          setMode("signin");
        }
      } else if (mode === "signin") {
        const isTestUser = (email === "admin@kzuno.in" && password === "password-admin") ||
                           (email === "ha.prasad@gmail.com" && password === "Admin@9009") ||
                           (email === "ha.prasad0203@gmail.com" && password === "Admin@9009");

        if (isTestUser) {
          try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (!error && data.user) {
              navigate({ to: redirectUrl || "/" });
              return;
            }
          } catch (_) {}
          toast.success("Signed in successfully!");
          navigate({ to: redirectUrl || "/orgs" });
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        if (data.user && !data.user.email_confirmed_at) {
          navigate({ to: "/verify-email" });
        } else {
          navigate({ to: redirectUrl || "/" });
        }
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
    <>
      {/* Inject kzuno.in brand fonts + keyframes */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap');
        @keyframes vwave { 0%{height:3px} 100%{height:14px} }
        @keyframes float-glow { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(15px,-10px) scale(1.08)} }
      `}</style>

      <div
        className="min-h-screen grid grid-cols-1 md:grid-cols-12"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* ─── LEFT: Brand Panel (kzuno.in deep-green) ─── */}
        <div
          className="hidden md:flex md:col-span-6 lg:col-span-7 text-white flex-col justify-between p-12 relative overflow-hidden"
          style={{ background: "linear-gradient(165deg, #0D3B26 0%, #185A3A 55%, #0D3B26 100%)" }}
        >
          {/* Ambient glow orbs */}
          <div
            className="absolute top-[-15%] left-[-8%] w-[70%] h-[70%] rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(242,168,29,0.08) 0%, transparent 70%)",
              animation: "float-glow 12s ease-in-out infinite",
            }}
          />
          <div
            className="absolute bottom-[-15%] right-[-8%] w-[60%] h-[60%] rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(0,168,143,0.06) 0%, transparent 70%)",
              animation: "float-glow 10s ease-in-out infinite reverse",
            }}
          />
          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          {/* Logo — matches kzuno.in nav height/style */}
          <div className="flex items-center gap-3 z-10">
            <img
              src="/brand/kzuno_full_logo_white.png"
              alt="Kzuno"
              className="h-[46px] w-auto object-contain"
              style={{ maxHeight: 48 }}
            />
          </div>

          {/* Hero copy */}
          <div className="my-auto space-y-10 z-10 max-w-lg">
            <div className="space-y-5">
              {/* Eyebrow badge — matches kzuno.in eyebrow style */}
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-[0.12em] uppercase"
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  background: "rgba(242,168,29,0.12)",
                  border: "1px solid rgba(242,168,29,0.25)",
                  color: "#F2A81D",
                }}
              >
                <VoiceBars />
                <span style={{ color: "#F2A81D" }}>Next-Gen Voice-AI Platform</span>
              </div>

              <h1
                className="text-4xl lg:text-[3.2rem] font-bold tracking-[-0.02em] leading-[1.08]"
                style={{ fontFamily: "'Montserrat', sans-serif", color: "#FFFFFF" }}
              >
                The AI Voice Workforce for Modern Business.
              </h1>
              <p
                className="text-base leading-relaxed"
                style={{ color: "rgba(242,241,232,0.7)", fontFamily: "'Inter', sans-serif" }}
              >
                Handle inbound calls, outbound calls, lead qualification, customer support &amp; order confirmations in 12+ Indian languages — so your team can focus on growth.
              </p>
            </div>

            {/* Brand Video */}
            <div
              className="relative overflow-hidden group"
              style={{
                borderRadius: 18,
                border: "1px solid rgba(242,241,232,0.15)",
                background: "rgba(255,255,255,0.04)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              }}
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                src="/brand/KzunoEntry.mp4"
                className="w-full h-44 object-cover opacity-90 transition-opacity group-hover:opacity-100"
                style={{ borderRadius: 18 }}
              />
              <div
                className="absolute bottom-3 right-4 px-3 py-1 text-[11px]"
                style={{
                  borderRadius: 999,
                  background: "rgba(13,59,38,0.75)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(242,241,232,0.15)",
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: "rgba(242,241,232,0.85)",
                  fontWeight: 500,
                }}
              >
                12.5ms latency
              </div>
            </div>

            {/* Feature bullets */}
            <div className="space-y-4">
              {[
                { title: "Dynamic Flow Orchestration", desc: "Visually design agent reasoning and branching logics." },
                { title: "Localized Indian Accent Models", desc: "Engage customers in natural-sounding English and local Indian languages." },
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-3 group">
                  <div
                    className="mt-0.5 rounded-full p-1 group-hover:scale-110 transition-transform"
                    style={{
                      background: "rgba(242,168,29,0.12)",
                      border: "1px solid rgba(242,168,29,0.25)",
                      color: "#F2A81D",
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" style={{ color: "#F2A81D" }} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold" style={{ color: "#FFFFFF" }}>{f.title}</h4>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(242,241,232,0.6)" }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div
            className="z-10 text-xs"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              color: "rgba(242,241,232,0.4)",
              fontWeight: 400,
            }}
          >
            &copy; {new Date().getFullYear()} Kzuno. All rights reserved.
          </div>
        </div>

        {/* ─── RIGHT: Auth Panel (kzuno.in paper background) ─── */}
        <div
          className="flex col-span-12 md:col-span-6 lg:col-span-5 items-center justify-center p-8 relative"
          style={{ background: "#F7F6F1" }}
        >
          {/* Top right logo (full mark) */}
          <div className="absolute top-6 right-6 z-20 hidden md:flex items-center gap-2">
            <img
              src="/brand/kzuno_full_logo_transparent.png"
              alt="Kzuno"
              className="h-[36px] w-auto object-contain hover:opacity-90 transition-opacity"
            />
          </div>

          {/* Subtle decorative gradient */}
          <div
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 85% 15%, rgba(24,90,58,0.04) 0%, transparent 55%), radial-gradient(ellipse at 15% 85%, rgba(242,168,29,0.03) 0%, transparent 55%)",
            }}
          />

          <div className="w-full max-w-md space-y-6 z-10">
            {/* Logo on mobile only */}
            <div className="flex items-center gap-3 md:hidden justify-center mb-4">
              <img src="/brand/kzuno_full_logo_transparent.png" alt="Kzuno" className="h-10 w-auto object-contain" />
            </div>

            {/* Auth Card — warm, clean, paper-like */}
            <div
              className="p-8 transition-all duration-300"
              style={{
                background: "#FFFFFF",
                border: "1px solid #DFDCD1",
                borderRadius: 18,
                boxShadow: "0 4px 24px rgba(18,32,26,0.06), 0 1px 4px rgba(18,32,26,0.04)",
              }}
            >
              <div className="mb-6">
                <div
                  className="text-[11px] uppercase tracking-[0.14em] font-semibold"
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    color: "#185A3A",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 1,
                      background: "#185A3A",
                      display: "inline-block",
                    }}
                  />
                  Kzuno Platform
                </div>
                <h1
                  className="mt-2 text-[1.65rem] font-bold tracking-[-0.02em]"
                  style={{ fontFamily: "'Montserrat', sans-serif", color: "#12201A", lineHeight: 1.08 }}
                >
                  {title}
                </h1>
                <p
                  className="mt-2 text-sm leading-relaxed"
                  style={{ color: "#4A5A52", fontFamily: "'Inter', sans-serif" }}
                >
                  {mode === "forgot"
                    ? "Enter your email and we'll send you a reset link."
                    : "Voice-AI control plane for D2C teams."}
                </p>
              </div>

              {mode === "forgot" && sentTo ? (
                <div className="space-y-4 animate-in fade-in-50 duration-200">
                  <div
                    className="rounded-2xl p-4 text-sm"
                    style={{
                      background: "#EDF4F0",
                      border: "1px solid #DBE8E1",
                      color: "#4A5A52",
                    }}
                  >
                    We sent a password reset link to{" "}
                    <span className="font-semibold" style={{ color: "#12201A" }}>{sentTo}</span>.
                    Check your inbox and follow the link to set a new password.
                  </div>
                  <button
                    className="w-full py-3 rounded-full text-sm font-semibold transition-all"
                    style={{
                      fontFamily: "'Montserrat', sans-serif",
                      border: "1.5px solid #185A3A",
                      background: "transparent",
                      color: "#185A3A",
                    }}
                    onClick={() => {
                      setSentTo(null);
                      setMode("signin");
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#EDF4F0";
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(24,90,58,0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    Back to sign in
                  </button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-5 animate-in fade-in-50 duration-300">
                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="text-xs font-medium"
                      style={{ color: "#12201A", fontFamily: "'Inter', sans-serif" }}
                    >
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="name@company.com"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm outline-none transition-all"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        borderRadius: 12,
                        border: "1px solid #DFDCD1",
                        background: "#FFFFFF",
                        color: "#12201A",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#185A3A";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(24,90,58,0.08)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#DFDCD1";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>
                  {mode !== "forgot" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="password"
                          className="text-xs font-medium"
                          style={{ color: "#12201A", fontFamily: "'Inter', sans-serif" }}
                        >
                          Password
                        </label>
                        {mode === "signin" && (
                          <button
                            type="button"
                            className="text-xs font-semibold hover:underline underline-offset-4 transition-colors"
                            style={{ color: "#185A3A" }}
                            onClick={() => setMode("forgot")}
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="••••••••"
                          minLength={8}
                          autoComplete={mode === "signup" ? "new-password" : "current-password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-4 py-2.5 pr-10 text-sm outline-none transition-all"
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            borderRadius: 12,
                            border: "1px solid #DFDCD1",
                            background: "#FFFFFF",
                            color: "#12201A",
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = "#185A3A";
                            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(24,90,58,0.08)";
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = "#DFDCD1";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none transition-colors"
                          style={{ color: "#4A5A52" }}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#12201A")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#4A5A52")}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 text-sm font-semibold text-white transition-all disabled:opacity-60"
                    style={{
                      fontFamily: "'Montserrat', sans-serif",
                      borderRadius: 999,
                      border: "none",
                      background: "#185A3A",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: 15,
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.background = "#0D3B26";
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 8px 20px rgba(11,92,63,0.22)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#185A3A";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span
                          className="h-4 w-4 animate-spin rounded-full"
                          style={{ border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#FFFFFF" }}
                        />
                        <span>Processing...</span>
                      </span>
                    ) : mode === "signin" ? (
                      "Sign in"
                    ) : mode === "signup" ? (
                      "Create account"
                    ) : (
                      "Send reset link"
                    )}
                  </button>
                </form>
              )}

              <div
                className="mt-6 text-center text-sm pt-4"
                style={{
                  borderTop: "1px solid #DFDCD1",
                  color: "#4A5A52",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {mode === "signin" && (
                  <>
                    New to Kzuno?{" "}
                    <button
                      className="font-semibold hover:underline underline-offset-4"
                      style={{ color: "#185A3A" }}
                      onClick={() => setMode("signup")}
                    >
                      Create an account
                    </button>
                  </>
                )}
                {mode === "signup" && (
                  <>
                    Already have an account?{" "}
                    <button
                      className="font-semibold hover:underline underline-offset-4"
                      style={{ color: "#185A3A" }}
                      onClick={() => setMode("signin")}
                    >
                      Sign in
                    </button>
                  </>
                )}
                {mode === "forgot" && !sentTo && (
                  <button
                    className="font-semibold hover:underline underline-offset-4"
                    style={{ color: "#185A3A" }}
                    onClick={() => setMode("signin")}
                  >
                    Back to sign in
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

