import { createFileRoute, useNavigate } from "@tanstack/react-router";
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

export const Route = createFileRoute(
  "/_authenticated/orgs/$orgId/agents/$agentId/settings",
)({
  component: AgentSettings,
});

type Direction = "outbound" | "inbound";

function AgentSettings() {
  const { orgId, agentId } = Route.useParams();
  const { canEdit, loading: roleLoading } = useOrgRole(orgId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en-IN");
  const [direction, setDirection] = useState<Direction>("outbound");
  const [original, setOriginal] = useState({
    name: "",
    language: "en-IN",
    direction: "outbound" as Direction,
  });

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("id, name, language, direction")
        .eq("id", agentId)
        .maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        setName(data.name);
        setLanguage(data.language);
        setDirection(data.direction as Direction);
        setOriginal({
          name: data.name,
          language: data.language,
          direction: data.direction as Direction,
        });
      }
      setLoading(false);
    })();
  }, [agentId]);

  const dirty =
    name !== original.name ||
    language !== original.language ||
    direction !== original.direction;

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("agents")
      .update({ name: name.trim(), language, direction })
      .eq("id", agentId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOriginal({ name: name.trim(), language, direction });
    toast.success("Agent updated");
  }

  const readOnly = !roleLoading && !canEdit;

  return (
    <>
      <AppHeader
        breadcrumbs={[
          { label: "Organizations", to: "/orgs" },
          { label: "Agents", to: "/orgs/$orgId/agents", params: { orgId } },
          {
            label: original.name || "…",
            to: "/orgs/$orgId/agents/$agentId",
            params: { orgId, agentId },
          },
          { label: "Settings" },
        ]}
      />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Agent settings</h1>

        <Card className="mt-6 p-6">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agent-name">Name</Label>
                <Input
                  id="agent-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={language}
                    onValueChange={setLanguage}
                    disabled={readOnly}
                  >
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
                    onValueChange={(v) => setDirection(v as Direction)}
                    disabled={readOnly}
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
              {!readOnly && (
                <div className="pt-2">
                  <Button
                    onClick={save}
                    disabled={saving || !dirty || !name.trim()}
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </main>
    </>
  );
}
