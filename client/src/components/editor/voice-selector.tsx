"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { voices } from "@/lib/speech-config";
import { useState } from "react";

export function VoiceSelector({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const selected = voices.find(voice => voice.id === value);
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<string>(selected?.gender ?? "Female");
  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">Voice</span>
      <Dialog open={open} onOpenChange={(nextOpen) => {
        if (nextOpen) setGroup(selected?.gender ?? "Female");
        setOpen(nextOpen);
      }}>
        <DialogTrigger render={<Button variant="outline" className="justify-self-start" />}>
          {selected?.name ?? "Choose voice"}
        </DialogTrigger>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Choose a voice</DialogTitle></DialogHeader>
          <Tabs value={group} onValueChange={setGroup}>
            <TabsList aria-label="Voice group">
              {["Male", "Female"].map(group => <TabsTrigger key={group} value={group}>{group}</TabsTrigger>)}
            </TabsList>
            {["Male", "Female"].map(group => (
              <TabsContent key={group} value={group} className="grid gap-3">
                {voices.filter(voice => voice.gender === group).map(voice => (
                  <div key={voice.id} className="grid gap-2 rounded-lg border p-3">
                    <Button variant={value === voice.id ? "secondary" : "ghost"} aria-pressed={value === voice.id}
                      className="justify-start" onClick={() => { onChange(voice.id); setOpen(false); }}>
                      {voice.name}
                    </Button>
                    <audio controls preload="none" className="h-9 w-full" aria-label={`Preview ${voice.name}`}
                      src={`https://vms.cdn.speechify.com/previews/${voice.preview}.mp3`} />
                  </div>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

