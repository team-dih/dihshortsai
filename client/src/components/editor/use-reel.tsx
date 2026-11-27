"use client";

import { Player } from "@remotion/player";
import { Film } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { loadReelMedia, type ReelMediaRequest } from "@/lib/reel-media";
import { buildReelTimeline, bubbleFont, defaultMessageEasing, reelFps } from "@/lib/reel-timeline";
import type { VideoProject } from "@/types/fake_text";
import { ReelComposition, type ReelProps } from "./reel-composition";

type Media = Awaited<ReturnType<typeof loadReelMedia>>;

export function useReel(project: VideoProject, background: ReelMediaRequest["background"]) {
  const timeline = useMemo(() => {
    const canvas = document.createElement("canvas").getContext("2d")!;
    canvas.font = bubbleFont;
    return buildReelTimeline(project.messages, text => canvas.measureText(text).width,
      project.appearence.chatWidth, project.appearence.messageTransitionMs);
  }, [project.messages, project.appearence.chatWidth, project.appearence.messageTransitionMs]);
  const request: ReelMediaRequest = {
    background,
    audioIds: project.audio.voiceover === false ? [] : [...new Set(timeline.narration.map(cue => cue.assetId))].sort(),
  };
  const key = JSON.stringify(request);
  const [loaded, setLoaded] = useState<{ key: string; media?: Media; error?: string }>();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const activeExport = useRef<AbortController | null>(null);
  useEffect(() => () => activeExport.current?.abort(), []);
  useEffect(() => {
    let active = true;
    let media: Media | undefined;
    loadReelMedia(JSON.parse(key)).then(result => {
      if (!active) return result.dispose();
      media = result;
      setLoaded({ key, media });
    }).catch((cause: Error) => { if (active) setLoaded({ key, error: cause.message }); });
    return () => { active = false; media?.dispose(); };
  }, [key]);

  const media = loaded?.key === key ? loaded.media : undefined;
  const props = (assets: Media): ReelProps => ({
    background: assets.background, voices: assets.voices, timeline,
    contact: project.participants.find(person => person.role === "incomming") ?? project.participants[0],
    position: project.appearence.chatPosition ?? "top",
    messageEasing: project.appearence.messageEasing ?? defaultMessageEasing,
    contactHeader: project.appearence.contactHeader ?? "first",
  });

  async function exportVideo() {
    if (activeExport.current) return;
    const controller = new AbortController();
    activeExport.current = controller;
    setError("");
    setProgress(0);
    let snapshot: Media | undefined;
    try {
      const { renderMediaOnWeb, canRenderMediaOnWeb } = await import("@remotion/web-renderer");
      const options = { container: "mp4" as const, width: 1080, height: 1920, muted: !request.audioIds.length };
      let support = await canRenderMediaOnWeb(options);
      let audioCodec: "aac" | "opus" = "aac";
      if (!support.canRender && support.issues.some(issue => issue.type === "audio-codec-unsupported")) {
        audioCodec = "opus";
        support = await canRenderMediaOnWeb({ ...options, audioCodec });
      }
      if (!support.canRender) throw new Error(support.issues.map(issue => issue.message).join(" "));
      snapshot = await loadReelMedia(request);
      controller.signal.throwIfAborted();
      const inputProps = props(snapshot);
      const result = await renderMediaOnWeb({
        composition: { id: "MessageReel", component: ReelComposition, defaultProps: inputProps, width: 1080, height: 1920, fps: reelFps, durationInFrames: timeline.durationInFrames },
        inputProps, container: "mp4", muted: options.muted, audioCodec, signal: controller.signal,
        onProgress: ({ progress }) => setProgress(Math.round(progress * 100)),
      });
      const url = URL.createObjectURL(await result.getBlob());
      const link = document.createElement("a");
      link.href = url;
      link.download = (project.name.trim() || "Message reel") + ".mp4";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "MP4 export failed.");
    } finally {
      snapshot?.dispose();
      activeExport.current = null;
      setProgress(null);
    }
  }

  return {
    action: <Button size="lg" className="ml-auto" disabled={!media || !timeline.bubbles.length || progress !== null} onClick={() => void exportVideo()}>
      <Film aria-hidden="true" />{progress === null ? "Generate Video" : `Rendering ${progress}%`}
    </Button>,
    preview: media ? <Player component={ReelComposition} inputProps={props(media)} fps={reelFps}
      compositionWidth={1080} compositionHeight={1920} durationInFrames={timeline.durationInFrames}
      controls style={{ width: "100%", height: "100%" }}
      errorFallback={({ error }) => <p role="alert">Preview unavailable: {error.message}</p>}
    /> : <p role="status">{loaded?.key === key && loaded.error || "Loading preview…"}</p>,
    status: error || (project.audio.voiceover !== false && project.messages.some(message => message.text.trim() && !message.audio)
      ? "Messages without generated audio use silent reading time." : ""),
  };
}

