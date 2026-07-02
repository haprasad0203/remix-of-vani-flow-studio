import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function AppHeader({
  breadcrumbs,
}: {
  breadcrumbs?: { label: string; to?: string; params?: Record<string, string> }[];
}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3 text-sm">
          <Link to="/" className="font-semibold tracking-wide">
            VANI
          </Link>
          {breadcrumbs?.map((b, i) => (
            <span key={i} className="flex items-center gap-3 text-muted-foreground">
              <span>/</span>
              {b.to ? (
                <Link
                  to={b.to as any}
                  params={b.params as any}
                  className="hover:text-foreground"
                >
                  {b.label}
                </Link>
              ) : (
                <span className="text-foreground">{b.label}</span>
              )}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            to="/profile"
            className="hidden sm:inline hover:text-foreground"
            title="Your profile"
          >
            {email || "Profile"}
          </Link>
          <Button variant="ghost" size="sm" asChild className="sm:hidden">
            <Link to="/profile">Profile</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
