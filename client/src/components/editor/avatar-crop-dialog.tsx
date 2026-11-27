"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const size = 384;

export function AvatarCropDialog({ image, onCancel, onSave }: {
  image: HTMLImageElement;
  onCancel: () => void;
  onSave: (avatar: string) => void;
}) {
  const preview = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [horizontal, setHorizontal] = useState(50);
  const [vertical, setVertical] = useState(50);
  const cropSize = Math.min(image.naturalWidth, image.naturalHeight) / zoom;
  const left = (image.naturalWidth - cropSize) * horizontal / 100;
  const top = (image.naturalHeight - cropSize) * vertical / 100;

  useEffect(() => {
    const context = preview.current?.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, size, size);
    context.drawImage(image, left, top, cropSize, cropSize, 0, 0, size, size);
  }, [image, left, top, cropSize]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crop profile picture</DialogTitle>
          <DialogDescription>Adjust the zoom and position within the square preview.</DialogDescription>
        </DialogHeader>
        <canvas
          ref={preview}
          width={size}
          height={size}
          role="img"
          aria-label="Square crop preview"
          className="aspect-square w-full max-w-64 justify-self-center rounded-lg bg-muted ring-1 ring-border"
        />
        <div className="grid gap-2">
          <Label htmlFor="avatar-zoom">Zoom</Label>
          <Input id="avatar-zoom" type="range" min={1} max={4} step={0.01} value={zoom} onChange={(event) => setZoom(event.currentTarget.valueAsNumber)} />
          <Label htmlFor="avatar-horizontal">Horizontal position</Label>
          <Input id="avatar-horizontal" type="range" min={0} max={100} value={horizontal} disabled={image.naturalWidth === cropSize} onChange={(event) => setHorizontal(event.currentTarget.valueAsNumber)} />
          <Label htmlFor="avatar-vertical">Vertical position</Label>
          <Input id="avatar-vertical" type="range" min={0} max={100} value={vertical} disabled={image.naturalHeight === cropSize} onChange={(event) => setVertical(event.currentTarget.valueAsNumber)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="button" onClick={() => {
            if (preview.current) onSave(preview.current.toDataURL("image/webp", 0.9));
          }}>Use picture</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
