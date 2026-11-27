"use client";

import { useEffect, useState } from "react";

import { readBackgroundFile } from "@/lib/background-files";
import type { BackgroundCrop, BackgroundVideo } from "@/types/fake_text";

export const centeredBackgroundCrop: BackgroundCrop = { zoom: 1, horizontal: 50, vertical: 50 };

export function showBackgroundThumbnail(event: React.SyntheticEvent<HTMLVideoElement>) {
  const video = event.currentTarget;
  if (video.paused && video.currentTime === 0 && Number.isFinite(video.duration) && video.duration > 0) {
    video.currentTime = Math.min(0.1, video.duration / 2);
  }
}

export function useBackgroundUrl(video: BackgroundVideo, file?: File) {
  const id = video.source === "upload" ? video.id : null;
  const [upload, setUpload] = useState<{ id: string; url: string | null }>();

  useEffect(() => {
    if (!id) return;
    let active = true;
    let url: string | null = null;
    Promise.resolve(file ?? readBackgroundFile(id)).then((blob) => {
      if (!active) return;
      url = blob ? URL.createObjectURL(blob) : null;
      setUpload({ id, url });
    }).catch(() => {
      if (active) setUpload({ id, url: null });
    });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, file]);

  return video.source === "library" ? video.url : upload?.id === id ? upload.url : undefined;
}

export function CropVideo({ crop, className, ...props }: React.ComponentProps<"video"> & { crop: BackgroundCrop }) {
  const position = `${crop.horizontal}% ${crop.vertical}%`;
  return (
    <video
      {...props}
      muted
      playsInline
      className={`absolute inset-0 block size-full object-cover ${className ?? ""}`}
      style={{ objectPosition: position, transformOrigin: position, transform: `scale(${crop.zoom})` }}
    />
  );
}

export function BackgroundPreview({ video }: { video: BackgroundVideo & { crop: BackgroundCrop } }) {
  const url = useBackgroundUrl(video);
  const [failedUrl, setFailedUrl] = useState("");
  if (video.source === "library") {
    return <video key={video.url} src={video.url} muted playsInline controls preload="metadata" onLoadedMetadata={showBackgroundThumbnail} aria-label="Background preview" className="absolute inset-0 size-full bg-black object-contain" />;
  }
  if (url === null || (url && url === failedUrl)) {
    return <p role="status" className="px-3 text-sm text-muted-foreground">Background video unavailable</p>;
  }
  if (!url) return <p role="status" className="text-sm text-muted-foreground">Loading video…</p>;
  return <CropVideo key={url} src={url} crop={video.crop} autoPlay loop aria-label="Background preview" onError={() => setFailedUrl(url)} />;
}
