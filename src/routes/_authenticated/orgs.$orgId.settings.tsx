import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { useOrgRole } from "@/hooks/useOrgRole";

export const Route = createFileRoute("/_authenticated/orgs/$orgId/settings")({
  component: OrgSettings,
});

function OrgSettings() {
  const { orgId } = Route.useParams();
  const navigate = useNavigate();
  const { role, canEdit, isOwner, loading: roleLoading } = useOrgRole(orgId);

  const [orgName, setOrgName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: userRes }, { data: org, error }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("organizations").select("id, name").eq("id", orgId).maybeSingle(),
      ]);
      setUserId(userRes.user?.id ?? null);
      if (error) toast.error(error.message);
      if (org) {
        setOrgName(org.name);
        setOriginalName(org.name);
      }
      setLoading(false);
    })();
  }, [orgId]);

  async function saveName() {
    if (!orgName.trim() || orgName === originalName) return;
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({ name: orgName.trim() })
      .eq("id", orgId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOriginalName(orgName.trim());
    toast.success("Organization renamed");
  }

  async function leaveOrg() {
    if (!userId) return;
    setLeaving(true);
    const { error } = await supabase
      .from("org_members")
      .delete()
      .eq("org_id", orgId)
      .eq("user_id", userId);
    setLeaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Left organization");
    navigate({ to: "/orgs" });
  }

  async function deleteOrg() {
    if (deleteConfirm !== originalName) {
      toast.error("Type the organization name exactly to confirm");
      return;
    }
    setDeleting(true);
    const { error } = await supabase.from("organizations").delete().eq("id", orgId);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Organization deleted");
    navigate({ to: "/orgs" });
  }

  return (
    <>
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Organization settings</h1>

        <Card className="mt-6 p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            General
          </h2>
          <div className="mt-4 space-y-2">
            <Label htmlFor="org-name">Name</Label>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : canEdit ? (
              <div className="flex gap-2">
                <Input
                  id="org-name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
                <Button
                  onClick={saveName}
                  disabled={saving || !orgName.trim() || orgName === originalName}
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            ) : (
              <div className="text-sm">{originalName}</div>
            )}
          </div>
        </Card>

        <Card className="mt-6 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Members
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                People with access to this organization.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/orgs/$orgId/members" params={{ orgId }}>
                Manage Members
              </Link>
            </Button>
          </div>
        </Card>

        {!roleLoading && role && (
          <Card className="mt-6 border-destructive/40 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-destructive">
              Danger zone
            </h2>

            {!isOwner && (
              <div className="mt-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">Leave organization</div>
                  <div className="text-xs text-muted-foreground">
                    You will lose access to all agents and flows in this org.
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">Leave</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Leave organization?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You'll lose access to “{originalName}”. You can be re-invited later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={leaveOrg} disabled={leaving}>
                        {leaving ? "Leaving…" : "Leave"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {isOwner && (
              <div className="mt-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">Delete organization</div>
                  <div className="text-xs text-muted-foreground">
                    Permanently deletes the org and all its agents, flows, and members. This
                    cannot be undone.
                  </div>
                </div>
                <AlertDialog
                  onOpenChange={(open) => {
                    if (!open) setDeleteConfirm("");
                  }}
                >
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete “{originalName}”?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this organization and every agent, flow,
                        and member inside it. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-name">
                        Type <span className="font-mono">{originalName}</span> to confirm
                      </Label>
                      <Input
                        id="confirm-name"
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.preventDefault();
                          deleteOrg();
                        }}
                        disabled={deleting || deleteConfirm !== originalName}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleting ? "Deleting…" : "Delete organization"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </Card>
        )}
      </main>
    </>
  );
}
