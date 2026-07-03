import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { useOrgRole } from "@/hooks/useOrgRole";

export const Route = createFileRoute("/_authenticated/orgs/$orgId/agents/")({
  component: AgentsList,
});

type Agent = {
  id: string;
  name: string;
  language: string;
  direction: string;
  created_at: string;
};

type Org = { id: string; name: string };

function AgentsList() {
  const { orgId } = Route.useParams();
  const [org, setOrg] = useState<Org | null>(null);
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en-IN");
  const [direction, setDirection] = useState<"outbound" | "inbound">("outbound");
  const [creating, setCreating] = useState(false);

  async function load() {
    const [orgRes, agentsRes] = await Promise.all([
      supabase.from("organizations").select("id, name").eq("id", orgId).maybeSingle(),
      supabase
        .from("agents")
        .select("id, name, language, direction, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false }),
    ]);
    if (orgRes.error) toast.error(orgRes.error.message);
    if (agentsRes.error) toast.error(agentsRes.error.message);
    setOrg(orgRes.data);
    setAgents(agentsRes.data ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function createAgent(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("agents").insert({
      org_id: orgId,
      name: name.trim(),
      language,
      direction,
    });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOpen(false);
    setName("");
    load();
  }

  return (
    <>
      <AppHeader
        breadcrumbs={[
          { label: "Organizations", to: "/orgs" },
          { label: org?.name ?? "…" },
        ]}
      />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Voice agents in this organization. Pick one to manage its flows.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>New agent</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create agent</DialogTitle>
              </DialogHeader>
              <form onSubmit={createAgent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-name">Name</Label>
                  <Input
                    id="agent-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Order Recovery Bot"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en-IN">English (India)</SelectItem>
                        <SelectItem value="hi-IN">Hindi</SelectItem>
                        <SelectItem value="ta-IN">Tamil</SelectItem>
                        <SelectItem value="te-IN">Telugu</SelectItem>
                        <SelectItem value="mr-IN">Marathi</SelectItem>
                        <SelectItem value="bn-IN">Bengali</SelectItem>
                        <SelectItem value="kn-IN">Kannada</SelectItem>
                        <SelectItem value="gu-IN">Gujarati</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Direction</Label>
                    <Select
                      value={direction}
                      onValueChange={(v) => setDirection(v as "outbound" | "inbound")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="outbound">Outbound</SelectItem>
                        <SelectItem value="inbound">Inbound</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={creating}>
                    {creating ? "Creating…" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
          {agents === null && <div className="text-sm text-muted-foreground">Loading…</div>}
          {agents && agents.length === 0 && (
            <Card className="col-span-full p-8 text-center text-sm text-muted-foreground">
              No agents yet. Create your first one.
            </Card>
          )}
          {agents?.map((a) => (
            <Link
              key={a.id}
              to="/orgs/$orgId/agents/$agentId"
              params={{ orgId, agentId: a.id }}
            >
              <Card className="p-5 transition hover:border-foreground/30">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{a.name}</div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                    {a.direction}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {a.language} · created {new Date(a.created_at).toLocaleDateString()}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
