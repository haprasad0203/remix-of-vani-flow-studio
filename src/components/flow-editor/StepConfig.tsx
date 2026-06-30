import { useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  FlowNode,
  FlowDraft,
  NODE_TYPE_MAP,
} from "@/lib/flow-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { synthesizeSpeech } from "@/lib/sarvam.functions";
import { toast } from "sonner";
import { Loader2, Play } from "lucide-react";

interface Props {
  node: FlowNode;
  draft: FlowDraft;
  onChange: (next: FlowNode) => void;
}

const END_VALUE = "__end__";

export function StepConfig({ node, draft, onChange }: Props) {
  const meta = NODE_TYPE_MAP[node.type];

  function setConfig(key: string, value: unknown) {
    onChange({ ...node, config: { ...node.config, [key]: value } });
  }
  function setNext(outcome: string, targetId: string) {
    onChange({
      ...node,
      next: { ...node.next, [outcome]: targetId === END_VALUE ? null : targetId },
    });
  }

  const otherNodes = draft.nodes.filter((n) => n.id !== node.id);

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        {node.type === "disclosure" && (
          <>
            <Field label="Disclosure text">
              <Textarea
                rows={3}
                value={(node.config.disclosure_text as string) ?? ""}
                onChange={(e) => setConfig("disclosure_text", e.target.value)}
                placeholder="This call is being recorded for quality and training…"
              />
            </Field>
            <Field label="Opt-out keyword">
              <Input
                value={(node.config.opt_out_keyword as string) ?? ""}
                onChange={(e) => setConfig("opt_out_keyword", e.target.value)}
                placeholder="stop"
              />
            </Field>
          </>
        )}

        {node.type === "agent_speaks" && (
          <>
            <Field label="Prompt text">
              <Textarea
                rows={3}
                value={(node.config.prompt_text as string) ?? ""}
                onChange={(e) => setConfig("prompt_text", e.target.value)}
                placeholder="Hi {{customer_name}}, this is a quick call about your recent order…"
              />
            </Field>
            <Field label="Language override (optional)">
              <Input
                value={(node.config.language_override as string) ?? ""}
                onChange={(e) => setConfig("language_override", e.target.value)}
                placeholder="hi-IN"
              />
            </Field>
          </>
        )}

        {node.type === "listen" && (
          <>
            <Field label="What to capture">
              <Input
                value={(node.config.capture as string) ?? ""}
                onChange={(e) => setConfig("capture", e.target.value)}
                placeholder="Confirmation (yes/no), delivery date, etc."
              />
            </Field>
            <Field label="Variable name">
              <Input
                value={(node.config.variable_name as string) ?? ""}
                onChange={(e) => setConfig("variable_name", e.target.value)}
                placeholder="confirmation"
              />
            </Field>
            <Field label="Max retries">
              <Input
                type="number"
                min={0}
                max={5}
                value={(node.config.max_retries as number) ?? 2}
                onChange={(e) => setConfig("max_retries", Number(e.target.value))}
              />
            </Field>
          </>
        )}

        {node.type === "decision" && (
          <Field label="Condition expression">
            <Input
              value={(node.config.condition as string) ?? ""}
              onChange={(e) => setConfig("condition", e.target.value)}
              placeholder="confirmation == 'yes'"
            />
          </Field>
        )}

        {node.type === "lookup" && (
          <>
            <Field label="Endpoint URL">
              <Input
                value={(node.config.endpoint as string) ?? ""}
                onChange={(e) => setConfig("endpoint", e.target.value)}
                placeholder="https://api.example.com/orders/{{order_id}}"
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Method">
                <Select
                  value={(node.config.method as string) ?? "GET"}
                  onValueChange={(v) => setConfig("method", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="col-span-2">
                <Field label="Request mapping (JSON)">
                  <Textarea
                    rows={3}
                    value={(node.config.request_mapping as string) ?? ""}
                    onChange={(e) => setConfig("request_mapping", e.target.value)}
                    placeholder='{ "order_id": "{{order_id}}" }'
                    className="font-mono text-xs"
                  />
                </Field>
              </div>
            </div>
          </>
        )}

        {node.type === "knowledge" && (
          <>
            <Field label="Query source">
              <Input
                value={(node.config.query_source as string) ?? ""}
                onChange={(e) => setConfig("query_source", e.target.value)}
                placeholder="returns_policy_kb"
              />
            </Field>
            <Field label="Top-k results">
              <Input
                type="number"
                min={1}
                max={20}
                value={(node.config.top_k as number) ?? 3}
                onChange={(e) => setConfig("top_k", Number(e.target.value))}
              />
            </Field>
          </>
        )}

        {node.type === "followup" && (
          <>
            <Field label="Channel">
              <Select
                value={(node.config.channel as string) ?? "sms"}
                onValueChange={(v) => setConfig("channel", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Template">
              <Textarea
                rows={2}
                value={(node.config.template as string) ?? ""}
                onChange={(e) => setConfig("template", e.target.value)}
                placeholder="Hi {{name}}, your order {{order_id}} is confirmed for delivery on {{date}}."
              />
            </Field>
            <Field label="Variables (comma separated)">
              <Input
                value={(node.config.variables as string) ?? ""}
                onChange={(e) => setConfig("variables", e.target.value)}
                placeholder="name, order_id, date"
              />
            </Field>
          </>
        )}

        {node.type === "handoff" && (
          <>
            <Field label="Destination number / team">
              <Input
                value={(node.config.destination as string) ?? ""}
                onChange={(e) => setConfig("destination", e.target.value)}
                placeholder="+91xxxxxxxxxx or support_team_a"
              />
            </Field>
            <Field label="Reason tag">
              <Input
                value={(node.config.reason_tag as string) ?? ""}
                onChange={(e) => setConfig("reason_tag", e.target.value)}
                placeholder="refund_request"
              />
            </Field>
          </>
        )}

        {node.type === "switch_language" && (
          <>
            <Field label="Target language">
              <Input
                value={(node.config.target_language as string) ?? ""}
                onChange={(e) => setConfig("target_language", e.target.value)}
                placeholder="hi-IN"
              />
            </Field>
            <Field label="Voice mapping">
              <Input
                value={(node.config.voice_mapping as string) ?? ""}
                onChange={(e) => setConfig("voice_mapping", e.target.value)}
                placeholder="meera_v2"
              />
            </Field>
          </>
        )}

        {node.type === "end_call" && (
          <Field label="Closing line">
            <Textarea
              rows={2}
              value={(node.config.closing_line as string) ?? ""}
              onChange={(e) => setConfig("closing_line", e.target.value)}
              placeholder="Thanks for your time. Have a great day!"
            />
          </Field>
        )}
      </div>

      {meta.outcomes.length > 0 && (
        <div className="rounded-md border bg-muted/30 p-4">
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            What happens next
          </div>
          <div className="space-y-3">
            {meta.outcomes.map((o) => (
              <div key={o.key} className="flex items-center gap-3">
                <div className="min-w-[160px] text-sm">{o.label}</div>
                <Select
                  value={node.next[o.key] ?? END_VALUE}
                  onValueChange={(v) => setNext(o.key, v)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={END_VALUE}>— End of flow —</SelectItem>
                    {otherNodes.map((n, i) => {
                      const idx = draft.nodes.findIndex((x) => x.id === n.id);
                      return (
                        <SelectItem key={n.id} value={n.id}>
                          Step {idx + 1}: {NODE_TYPE_MAP[n.type].label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}

      {meta.terminal && (
        <div className="rounded-md border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          This is a terminal step — the call ends here.
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
