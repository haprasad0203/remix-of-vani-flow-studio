import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { VoiceTester } from "@/components/VoiceTester";

export const Route = createFileRoute("/_authenticated/orgs/")({
  component: OrgPicker,
});

type Org = { id: string; name: string; created_at: string };

function OrgPicker() {
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, created_at")
      .order("created_at", { ascending: true });
    if (error) {
      toast.error(error.message);
      setOrgs([]);
      return;
    }
    setOrgs(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const { data, error } = await supabase
      .rpc("create_organization", { _name: newName.trim() })
      .single();
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOpen(false);
    setNewName("");
    window.location.assign(`/orgs/${(data as { id: string }).id}/agents`);
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Your organizations</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick an organization to manage its agents and flows.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>New organization</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create organization</DialogTitle>
              </DialogHeader>
              <form onSubmit={createOrg} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Name</Label>
                  <Input
                    id="org-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Acme Beauty Co."
                    required
                  />
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

        <div className="mt-8 space-y-3">
          {orgs === null && <div className="text-sm text-muted-foreground">Loading…</div>}
          {orgs && orgs.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                You don't belong to any organization yet. Create one to get started.
              </p>
            </Card>
          )}
          {orgs?.map((o) => (
            <Link
              key={o.id}
              to="/orgs/$orgId/agents"
              params={{ orgId: o.id }}
              className="block"
            >
              <Card className="p-5 transition hover:border-foreground/30">
                <div className="font-medium">{o.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Created {new Date(o.created_at).toLocaleDateString()}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
