import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { synthesizeSpeech } from "@/lib/sarvam.functions";
import { initiateTestCall } from "@/lib/exotel.functions";
import { toast } from "sonner";
import { Loader2, Play, PhoneCall } from "lucide-react";

export function VoiceTester() {
  const tts = useServerFn(synthesizeSpeech);
  const call = useServerFn(initiateTestCall);

  const [text, setText] = useState(
    "Hi! This is your AI calling agent powered by Sarvam.",
  );
  const [lang, setLang] = useState("en-IN");
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [callText, setCallText] = useState(
    "Hello! This is a test call from your AI calling agent. Have a great day!",
  );
  const [callLang, setCallLang] = useState("en-IN");
  const [toNumber, setToNumber] = useState("");
  const [calling, setCalling] = useState(false);
  const [lastCall, setLastCall] = useState<{ sid: string | null; to: string } | null>(null);

  async function play() {
    if (!text.trim()) {
      toast.error("Enter some text first");
      return;
    }
    setLoading(true);
    try {
      const { audio_base64, mime_type } = await tts({
        data: { text: text.trim(), target_language_code: lang.trim() || "en-IN" },
      });
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      const audio = new Audio(`data:${mime_type};base64,${audio_base64}`);
      audioRef.current = audio;
      await audio.play();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Voice test failed");
    } finally {
      setLoading(false);
    }
  }

  async function startCall() {
    if (!toNumber.trim()) {
      toast.error("Enter a destination number");
      return;
    }
    if (!callText.trim()) {
      toast.error("Enter what the agent should say");
      return;
    }
    setCalling(true);
    setLastCall(null);
    try {
      const res = await call({
        data: {
          to: toNumber.trim(),
          text: callText.trim(),
          target_language_code: callLang.trim() || "en-IN",
        },
      });
      setLastCall({ sid: res.call_sid, to: res.to });
      toast.success(`Calling ${res.to}…`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test call failed");
    } finally {
      setCalling(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-4">
        <h2 className="text-sm font-medium">Voice testing</h2>
        <p className="text-xs text-muted-foreground">
          Preview Sarvam TTS in the browser, or place a live test call via Exotel.
        </p>
      </div>

      <Tabs defaultValue="voice">
        <TabsList>
          <TabsTrigger value="voice">Test voice</TabsTrigger>
          <TabsTrigger value="call">Test call</TabsTrigger>
        </TabsList>

        <TabsContent value="voice" className="mt-4 grid gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Text
            </Label>
            <Textarea
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type something for the agent to say…"
            />
          </div>
          <div className="flex items-end gap-3">
            <div className="w-32 space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Language
              </Label>
              <Input
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                placeholder="en-IN"
              />
            </div>
            <Button onClick={play} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {loading ? "Generating…" : "Test voice"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="call" className="mt-4 grid gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Destination number
            </Label>
            <Input
              value={toNumber}
              onChange={(e) => setToNumber(e.target.value)}
              placeholder="+919999999999"
            />
            <p className="text-[11px] text-muted-foreground">
              On an Exotel free trial, the number must be verified in your Exotel
              dashboard or the call will silently fail.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              What the agent should say
            </Label>
            <Textarea
              rows={3}
              value={callText}
              onChange={(e) => setCallText(e.target.value)}
              placeholder="Hello, this is a test call from your AI agent…"
            />
          </div>
          <div className="flex items-end gap-3">
            <div className="w-32 space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Language
              </Label>
              <Input
                value={callLang}
                onChange={(e) => setCallLang(e.target.value)}
                placeholder="en-IN"
              />
            </div>
            <Button onClick={startCall} disabled={calling}>
              {calling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PhoneCall className="mr-2 h-4 w-4" />
              )}
              {calling ? "Placing call…" : "Place test call"}
            </Button>
          </div>
          {lastCall && (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
              <div>
                Call queued to <span className="font-medium">{lastCall.to}</span>
              </div>
              {lastCall.sid && (
                <div className="text-muted-foreground">Exotel Call SID: {lastCall.sid}</div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
