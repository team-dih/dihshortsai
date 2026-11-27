"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { generateMessageAudio, messageAudioHint, readMessageAudio } from "@/lib/message-audio";
import type { MessageAudioRef } from "@/types/fake_text";

import type { SpeechSettings } from "@/lib/speech-config";

export function MessageAudioControl({ text, voiceId, settings, audio, onSave }: {
  settings?: SpeechSettings;
  text: string;
  voiceId: string;
  audio?: MessageAudioRef;
  onSave: (reference: MessageAudioRef) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [reload, setReload] = useState(0);
  const assetId = audio?.assetId;
  useEffect(() => {
    if (!assetId) return;
    let active = true;
    let objectUrl = "";
    readMessageAudio(assetId).then(asset => {
      if (!active) return;
      if (!asset) {
        setError("Saved audio is missing from this browser. Generate it again.");
        return;
      }
      objectUrl = URL.createObjectURL(asset.blob);
      setUrl(objectUrl);
    }).catch(() => { if (active) setError("Could not open the saved audio."); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId, reload]);

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const { assetId, durationSeconds } = await generateMessageAudio(text, voiceId, settings);
      onSave({ assetId, durationSeconds });
      setReload(count => count + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Audio generation failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const hint = messageAudioHint(text, voiceId);
  return (
    <div className="grid gap-2">
      {assetId && url ? (
        <audio controls preload="metadata" className="h-9 w-full" aria-label="Generated message audio" src={url} />
      ) : (
        <Button type="button" variant="outline" size="sm" className="justify-self-start"
          disabled={busy || !text.trim() || Boolean(hint) || Boolean(assetId && !error)}
          onClick={() => void generate()}>{busy ? "Generating…" : "Generate audio"}</Button>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

