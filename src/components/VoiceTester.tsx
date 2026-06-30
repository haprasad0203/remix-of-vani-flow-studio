import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { synthesizeSpeech } from "@/lib/sarvam.functions";
import { toast } from "sonner";
import { Loader2, Play } from "lucide-react";

export function VoiceTester() {
  const tts = useServerFn(synthesizeSpeech);
  const [text, setText] = useState(
    "Hi! This is your AI calling agent powered by Sarvam.",
  );
  const [lang, setLang] = useState("en-IN");
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Test voice</h2>
          <p className="text-xs text-muted-foreground">
            Quick Sarvam TTS preview — synthesizes and plays in the browser.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
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
            <Input value={lang} onChange={(e) => setLang(e.target.value)} placeholder="en-IN" />
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
      </div>
    </Card>
  );
}
