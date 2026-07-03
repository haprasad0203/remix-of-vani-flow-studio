import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import {
  FlowDraft,
  FlowNode,
  NodeType,
  NODE_TYPES,
  NODE_TYPE_MAP,
  createNode,
  draftsEqual,
  normalizeDraft,
  nodeSummary,
} from "@/lib/flow-types";
import { StepConfig } from "@/components/flow-editor/StepConfig";
import { ChevronDown, ChevronUp, Trash2, ArrowUp, ArrowDown, Plus } from "lucide-react";
import { useOrgRole } from "@/hooks/useOrgRole";

export const Route = createFileRoute(
  "/_authenticated/orgs/$orgId/agents/$agentId/flows/$flowId/",
)({
  component: FlowEditor,
});

type FlowRow = {
  id: string;
  name: string;
  agent_id: string;
  draft_json: unknown;
  published_version_id: string | null;
};

type PublishedVersion = { id: string; version_number: number; json: unknown };

function FlowEditor() {
  const { orgId, agentId, flowId } = Route.useParams();

  const [flow, setFlow] = useState<FlowRow | null>(null);
  const [agentName, setAgentName] = useState<string>("");
  const [draft, setDraft] = useState<FlowDraft | null>(null);
  const [savedDraft, setSavedDraft] = useState<FlowDraft | null>(null);
  const [publishedJson, setPublishedJson] = useState<unknown | null>(null);
  const [publishedVersionNumber, setPublishedVersionNumber] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const dirty = useMemo(
    () => !!draft && !!savedDraft && !draftsEqual(draft, savedDraft),
    [draft, savedDraft],
  );
  const draftDifferentFromPublished = useMemo(() => {
    if (!draft) return false;
    if (!publishedJson) return true; // never published
    return !draftsEqual(draft, publishedJson);
  }, [draft, publishedJson]);

  async function load() {
    const { data: flowRow, error } = await supabase
      .from("flows")
      .select("id, name, agent_id, draft_json, published_version_id")
      .eq("id", flowId)
      .maybeSingle();
    if (error || !flowRow) {
      toast.error(error?.message ?? "Flow not found");
      return;
    }
    setFlow(flowRow);
    const agent = await supabase
      .from("agents")
      .select("name, language")
      .eq("id", flowRow.agent_id)
      .maybeSingle();
    setAgentName(agent.data?.name ?? "");
    const d = normalizeDraft(flowRow.draft_json, flowRow.agent_id, agent.data?.language);
    setDraft(d);
    setSavedDraft(d);
    if (flowRow.published_version_id) {
      const pv = await supabase
        .from("flow_versions")
        .select("id, version_number, json")
        .eq("id", flowRow.published_version_id)
        .maybeSingle();
      if (pv.data) {
        setPublishedJson(pv.data.json);
        setPublishedVersionNumber(pv.data.version_number);
      }
    } else {
      setPublishedJson(null);
      setPublishedVersionNumber(null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId]);

  // Warn on navigate-away with unsaved draft
  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  function updateDraft(updater: (d: FlowDraft) => FlowDraft) {
    setDraft((d) => (d ? updater(d) : d));
  }

  function addStep(type: NodeType) {
    const node = createNode(type);
    updateDraft((d) => ({
      ...d,
      nodes: [...d.nodes, node],
      entry_node: d.entry_node ?? node.id,
    }));
    setCollapsed((c) => ({ ...c, [node.id]: false }));
    setPicking(false);
  }

  function updateNode(updated: FlowNode) {
    updateDraft((d) => ({
      ...d,
      nodes: d.nodes.map((n) => (n.id === updated.id ? updated : n)),
    }));
  }

  function removeNode(id: string) {
    updateDraft((d) => {
      const nodes = d.nodes
        .filter((n) => n.id !== id)
        .map((n) => ({
          ...n,
          next: Object.fromEntries(
            Object.entries(n.next).map(([k, v]) => [k, v === id ? null : v]),
          ),
        }));
      return {
        ...d,
        nodes,
        entry_node: d.entry_node === id ? (nodes[0]?.id ?? null) : d.entry_node,
      };
    });
  }

  function moveNode(id: string, dir: -1 | 1) {
    updateDraft((d) => {
      const idx = d.nodes.findIndex((n) => n.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= d.nodes.length) return d;
      const nodes = [...d.nodes];
      [nodes[idx], nodes[target]] = [nodes[target], nodes[idx]];
      return { ...d, nodes };
    });
  }

  async function saveDraft() {
    if (!draft) return;
    setSaving(true);
    const { error } = await supabase
      .from("flows")
      .update({ draft_json: draft as never })
      .eq("id", flowId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSavedDraft(draft);
    toast.success("Draft saved");
  }

  async function publish() {
    if (!draft) return;
    if (dirty) {
      toast.error("Save your draft first before publishing.");
      return;
    }
    setPublishing(true);
    try {
      // Determine next version number
      const { data: latest, error: lerr } = await supabase
        .from("flow_versions")
        .select("version_number")
        .eq("flow_id", flowId)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lerr) throw lerr;
      const nextVersion = (latest?.version_number ?? 0) + 1;
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id;
      const { data: created, error: ierr } = await supabase
        .from("flow_versions")
        .insert({
          flow_id: flowId,
          version_number: nextVersion,
          json: draft as never,
          published_by: userId,
        })
        .select("id, version_number, json")
        .single();
      if (ierr) throw ierr;
      const { error: uerr } = await supabase
        .from("flows")
        .update({ published_version_id: created.id })
        .eq("id", flowId);
      if (uerr) throw uerr;
      setPublishedJson(draft);
      setPublishedVersionNumber(created.version_number);
      toast.success(`Published v${created.version_number}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  if (!draft || !flow) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto max-w-5xl px-6 py-10 text-sm text-muted-foreground">
          Loading…
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader
        breadcrumbs={[
          { label: "Organizations", to: "/orgs" },
          { label: "Agents", to: "/orgs/$orgId/agents", params: { orgId } },
          {
            label: agentName || "Agent",
            to: "/orgs/$orgId/agents/$agentId",
            params: { orgId, agentId },
          },
          { label: flow.name },
        ]}
      />
      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Header bar */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{flow.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {publishedVersionNumber ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Published v{publishedVersionNumber}
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  Never published
                </span>
              )}
              {draftDifferentFromPublished && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                  Draft has unpublished changes
                </span>
              )}
              {dirty && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200">
                  Unsaved edits
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link
                to="/orgs/$orgId/agents/$agentId/flows/$flowId/versions"
                params={{ orgId, agentId, flowId }}
              >
                Version history
              </Link>
            </Button>
            <Button variant="outline" onClick={saveDraft} disabled={saving || !dirty}>
              {saving ? "Saving…" : "Save draft"}
            </Button>
            <Button
              onClick={publish}
              disabled={publishing || dirty || !draftDifferentFromPublished}
              title={
                dirty
                  ? "Save your draft first"
                  : !draftDifferentFromPublished
                    ? "Nothing new to publish"
                    : ""
              }
            >
              {publishing ? "Publishing…" : "Publish"}
            </Button>
          </div>
        </div>

        {/* Flow-level config */}
        <Card className="mt-6 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Direction
              </Label>
              <Select
                value={draft.direction}
                onValueChange={(v) =>
                  updateDraft((d) => ({ ...d, direction: v as "outbound" | "inbound" }))
                }
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
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Language
              </Label>
              <Input
                value={draft.language}
                onChange={(e) =>
                  updateDraft((d) => ({ ...d, language: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Entry step
              </Label>
              <Select
                value={draft.entry_node ?? ""}
                onValueChange={(v) =>
                  updateDraft((d) => ({ ...d, entry_node: v || null }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="First step" />
                </SelectTrigger>
                <SelectContent>
                  {draft.nodes.map((n, i) => (
                    <SelectItem key={n.id} value={n.id}>
                      Step {i + 1}: {NODE_TYPE_MAP[n.type].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Steps */}
        <ol className="mt-8 space-y-3">
          {draft.nodes.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No steps yet. Add the first step below.
            </Card>
          )}
          {draft.nodes.map((node, i) => {
            const meta = NODE_TYPE_MAP[node.type];
            const isCollapsed = collapsed[node.id] ?? false;
            return (
              <li key={node.id}>
                <Card>
                  <div className="flex items-center gap-3 border-b px-4 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-medium text-background">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {meta.label}
                        {draft.entry_node === node.id && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                            Entry
                          </span>
                        )}
                        {meta.terminal && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                            Terminal
                          </span>
                        )}
                      </div>
                      {isCollapsed && (
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {nodeSummary(node)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={i === 0}
                        onClick={() => moveNode(node.id, -1)}
                        title="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={i === draft.nodes.length - 1}
                        onClick={() => moveNode(node.id, 1)}
                        title="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeNode(node.id)}
                        title="Delete step"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setCollapsed((c) => ({ ...c, [node.id]: !isCollapsed }))
                        }
                        title={isCollapsed ? "Expand" : "Collapse"}
                      >
                        {isCollapsed ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {!isCollapsed && (
                    <div className="p-5">
                      <StepConfig node={node} draft={draft} onChange={updateNode} />
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ol>

        {/* Add step */}
        <div className="mt-6 flex justify-center">
          <Dialog open={picking} onOpenChange={setPicking}>
            <DialogTrigger asChild>
              <Button variant="outline" size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Add a step
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add a step</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {NODE_TYPES.map((t) => (
                  <button
                    key={t.type}
                    onClick={() => addStep(t.type)}
                    className="rounded-md border p-3 text-left transition hover:border-foreground/40 hover:bg-muted/40"
                  >
                    <div className="text-sm font-medium">{t.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t.description}
                    </div>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </>
  );
}
