"use client";

import { CloudUpload, Pause, Play } from "lucide-react";
import { useRef, useState } from "react";

import { centeredBackgroundCrop, CropVideo, showBackgroundThumbnail, useBackgroundUrl } from "@/components/editor/background-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveBackgroundFile } from "@/lib/background-files";
import type { BackgroundClip, BackgroundCrop, BackgroundVideo, VideoProject } from "@/types/fake_text";

type Background = VideoProject["background"];
type Draft = { video: Extract<BackgroundVideo, { source: "upload" }>; crop?: BackgroundCrop; file?: File };

function BackgroundLibraryCard({ clip, selected, onSelect }: {
  clip: BackgroundClip;
  selected: boolean;
  onSelect: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative min-w-0">
      <Button
        type="button"
        variant="outline"
        aria-pressed={selected}
        className="h-auto w-full flex-col items-stretch gap-2 whitespace-normal p-2 aria-pressed:border-primary"
        onClick={onSelect}
      >
        <video
          ref={video}
          src={clip.url}
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
          className="aspect-[9/16] w-full rounded-md bg-black object-contain"
          onLoadedMetadata={showBackgroundThumbnail}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => { setFailed(true); setPlaying(false); }}
        />
        <span className="break-all">{clip.name}</span>
      </Button>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="absolute top-4 right-4"
        aria-label={`${playing ? "Pause" : "Play"} preview of ${clip.name}`}
        disabled={failed}
        onClick={() => {
          const element = video.current;
          if (!element) return;
          if (element.paused) void element.play().catch(() => setPlaying(false));
          else element.pause();
        }}
      >
        {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
      </Button>
    </div>
  );
}

function BackgroundCropDialog({ draft, onCancel, onSave }: {
  draft: Draft;
  onCancel: () => void;
  onSave: (background: Background) => void;
}) {
  const url = useBackgroundUrl(draft.video, draft.file);
  const video = useRef<HTMLVideoElement>(null);
  const [crop, setCrop] = useState(draft.crop ?? centeredBackgroundCrop);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function confirm() {
    setSaving(true);
    setError("");
    try {
      if (draft.file) {
        await saveBackgroundFile(draft.video.id, draft.file);
      }
      onSave({ ...draft.video, crop });
    } catch {
      setError("Could not save this video in browser storage.");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onCancel(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto" showCloseButton={!saving}>
        <DialogHeader>
          <DialogTitle>Crop background video</DialogTitle>
          <DialogDescription>Adjust the framing for the 9:16 video.</DialogDescription>
        </DialogHeader>
        <div className="relative aspect-[9/16] w-[min(11rem,24dvh)] justify-self-center overflow-hidden rounded-lg bg-black">
          {url && (
            <CropVideo
              ref={video}
              src={url}
              crop={crop}
              preload="auto"
              loop
              aria-label="9:16 crop preview"
              onLoadedData={(event) => {
                if (event.currentTarget.videoWidth > 0) setReady(true);
                else setError("This file does not contain video.");
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onError={() => {
                setReady(false);
                setError("This video could not be played. Choose a different file.");
              }}
            />
          )}
        </div>
        <Button type="button" variant="outline" size="sm" className="justify-self-center" disabled={!ready} onClick={() => {
          if (video.current?.paused) void video.current.play().catch(() => setError("Could not play this video."));
          else video.current?.pause();
        }}>{playing ? "Pause preview" : "Play preview"}</Button>
        <div className="grid gap-2">
          {([
            ["zoom", "Zoom", 1, 4, 0.01],
            ["horizontal", "Horizontal position", 0, 100, 1],
            ["vertical", "Vertical position", 0, 100, 1],
          ] as const).map(([field, label, min, max, step]) => (
            <div className="grid gap-1" key={field}>
              <Label htmlFor={`background-crop-${field}`}>{label}</Label>
              <Input id={`background-crop-${field}`} type="range" min={min} max={max} step={step} value={crop[field]} disabled={!ready || saving} onChange={(event) => {
                const value = event.currentTarget.valueAsNumber;
                setCrop((current) => ({ ...current, [field]: value }));
              }} />
            </div>
          ))}
        </div>
        {url === null && <p role="alert" className="text-destructive">This uploaded video is unavailable.</p>}
        {error && <p role="alert" className="text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={onCancel}>Cancel</Button>
          <Button type="button" disabled={!ready || saving} onClick={() => void confirm()}>
            {saving ? "Saving…" : "Use background"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BackgroundPanel({ background, clips, onChange }: {
  background: Background;
  clips: BackgroundClip[];
  onChange: (background: Background) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const current = "crop" in background ? background : null;

  return (
    <div className="grid gap-4">
      {current && (
        <Card size="sm">
          <CardContent className="grid gap-2">
            <p className="break-all text-sm font-medium">{current.name}</p>
            <div className="flex flex-wrap gap-2">
              {current.source === "upload" && (
                <Button variant="outline" onClick={() => setDraft({ video: current, crop: current.crop })}>Adjust crop</Button>
              )}
              <Button variant="ghost" onClick={() => onChange({ source: "none" })}>Remove background</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-2">
        <h2 className="text-sm font-medium">Background library</h2>
        {clips.length === 0 && <p className="text-sm text-muted-foreground">No bundled videos available.</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {clips.map((clip) => (
            <BackgroundLibraryCard
              key={clip.url}
              clip={clip}
              selected={current?.source === "library" && current.url === clip.url}
              onSelect={() => onChange({ source: "library", ...clip, crop: centeredBackgroundCrop })}
            />
          ))}
        </div>
      </div>
      <div>
        <Input ref={uploadInput} hidden type="file" accept="video/*,.m4v,.mov" onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) setDraft({ file, video: { source: "upload", id: crypto.randomUUID(), name: file.name } });
        }} />
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-36 w-full flex-col gap-3 whitespace-normal rounded-xl border-dashed bg-muted/30 px-4 py-6 text-center hover:border-primary/60 hover:bg-muted/60"
          onClick={() => uploadInput.current?.click()}
        >
          <span className="grid size-11 place-items-center rounded-lg bg-background ring-1 ring-border">
            <CloudUpload aria-hidden="true" className="size-6" />
          </span>
          <span className="grid gap-1">
            <span className="font-semibold">Upload a video</span>
            <span className="text-xs font-normal text-muted-foreground">Choose a video from your computer to crop to 9:16.</span>
          </span>
        </Button>
      </div>
      {draft && (
        <BackgroundCropDialog
          draft={draft}
          onCancel={() => setDraft(null)}
          onSave={(selection) => {
            onChange(selection);
            setDraft(null);
          }}
        />
      )}
    </div>
  );
}
