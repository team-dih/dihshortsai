"use client";

import { AudioLines, GripVertical, Image as ImageIcon, MessageSquare, MessagesSquare, Palette, Plus, Trash2, Upload, UsersRound } from "lucide-react";
import NextImage from "next/image";
import { useEffect, useRef, useState } from "react";

import type { SidebarSection } from "@/components/app-sidebar";
import { AvatarCropDialog } from "@/components/editor/avatar-crop-dialog";
import { BackgroundPanel } from "@/components/editor/background-panel";
import { centeredBackgroundCrop } from "@/components/editor/background-preview";
import { useReel } from "@/components/editor/use-reel";
import { defaultMessageEasing, defaultMessageTransitionMs, maxMessageTransitionMs, messageEasings, type MessageEasing } from "@/lib/reel-timeline";
import { EditorLayout } from "@/components/editor/editor-layout";
import { VoiceSelector } from "@/components/editor/voice-selector";
import { MessageAudioControl } from "@/components/editor/message-audio-control";
import { attachMessageAudio, generateMessageAudio, messageAudioHint } from "@/lib/message-audio";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Slider } from "@/components/ui/slider";
import { Sortable, SortableItem, SortableItemHandle } from "@/components/ui/sortable";
import { Textarea } from "@/components/ui/textarea";
import type { BackgroundClip, VideoProject } from "@/types/fake_text";
import { defaultSpeechSettings, speechPresets } from "@/lib/speech-config";

const sections = [
  {
    id: "script",
    label: "Script",
    items: [
      { id: "participants", label: "Participants", icon: UsersRound },
      { id: "conversation", label: "Conversation", icon: MessagesSquare },
    ],
  },
  {
    id: "visuals",
    label: "Visuals",
    items: [
      { id: "background", label: "Background", icon: ImageIcon },
      { id: "appearance", label: "Appearance", icon: Palette },
    ],
  },
  {
    id: "sound",
    label: "Sound",
    items: [{ id: "audio", label: "Audio", icon: AudioLines }],
  },
] as const satisfies readonly SidebarSection[];

const sidebarItems = sections.flatMap((section) => [...section.items]);
type EditorSection = (typeof sidebarItems)[number]["id"];

const descriptions: Record<EditorSection, string> = {
  participants: "Set up the two people in the conversation.",
  conversation: "Write messages and drag the handles to change their order.",
  background: "Choose the backdrop for this project.",
  appearance: "Set where the chat sits within the video frame.",
  audio: "Set voiceover preferences for this project.",
};

type EditorProps = {
  project: VideoProject;
  update: (change: (project: VideoProject) => VideoProject) => void;
};

type Participant = VideoProject["participants"][number];
type Message = VideoProject["messages"][number];

function participantLabel(participant: Participant) {
  return participant.role === "incomming" ? "Incoming" : "Outgoing";
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0].toLocaleUpperCase()).join("") || "🙂";
}

function ParticipantsPanel({ project, update }: EditorProps) {
  const avatarInputs = useRef<(HTMLInputElement | null)[]>([]);
  const uploadRequest = useRef(0);
  const [crop, setCrop] = useState<{ index: number; image: HTMLImageElement } | null>(null);
  const [uploadError, setUploadError] = useState<number | null>(null);

  async function openCrop(index: number, file: File) {
    const request = ++uploadRequest.current;
    setUploadError(null);
    const url = URL.createObjectURL(file);
    try {
      const image = new window.Image();
      image.src = url;
      await image.decode();
      if (request === uploadRequest.current) setCrop({ index, image });
    } catch {
      if (request === uploadRequest.current) setUploadError(index);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function updateParticipant(index: number, fields: Partial<Participant>) {
    update((current) => {
      const participants = [...current.participants] as VideoProject["participants"];
      participants[index] = { ...participants[index], ...fields };
      const previous = current.participants[index];
      const messages = participants[index].voiceId === previous.voiceId ? current.messages
        : current.messages.map(message => message.senderId === previous.role ? { ...message, audio: undefined } : message);
      return { ...current, participants, messages };
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {project.participants.map((participant, index) => (
        <Card key={participant.role} className="bg-background/40">
          <CardHeader><CardTitle>{participantLabel(participant)}</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor={`participant-${index}-name`}>Display name</Label>
              <Input
                id={`participant-${index}-name`}
                value={participant.displayName}
                onChange={(event) => updateParticipant(index, { displayName: event.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`participant-${index}-avatar`}>Profile picture</Label>
              <input
                id={`participant-${index}-avatar`}
                ref={(input) => { avatarInputs.current[index] = input; }}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void openCrop(index, file);
                }}
              />
              <div className="flex items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#e5e5ea] text-sm font-semibold text-[#3c3c43]" aria-label={participant.avater ? `Preview of ${participant.displayName}'s profile picture` : `Default profile icon for ${participant.displayName}`}>
                  {participant.avater
                    ? <NextImage src={participant.avater} alt="" width={48} height={48} unoptimized className="size-full object-cover" />
                    : <span aria-hidden="true">{initials(participant.displayName)}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => avatarInputs.current[index]?.click()}>
                    <Upload aria-hidden="true" /> {participant.avater ? "Change picture" : "Upload picture"}
                  </Button>
                  {participant.avater && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => {
                      updateParticipant(index, { avater: null });
                      if (avatarInputs.current[index]) avatarInputs.current[index]!.value = "";
                    }}>Remove</Button>
                  )}
                </div>
              </div>
              {uploadError === index && <p role="alert" className="text-sm text-destructive">This image could not be opened. Choose another picture.</p>}
            </div>
            <VoiceSelector value={participant.voiceId} onChange={voiceId => updateParticipant(index, { voiceId })} />
          </CardContent>
        </Card>
      ))}
      {crop && (
        <AvatarCropDialog
          image={crop.image}
          onCancel={() => setCrop(null)}
          onSave={(avater) => {
            updateParticipant(crop.index, { avater });
            setCrop(null);
          }}
        />
      )}
    </div>
  );
}

function ConversationPanel({ project, update }: EditorProps) {
  const [progress, setProgress] = useState("");
  const [batchError, setBatchError] = useState("");
  const pending = project.messages.flatMap((message, index) => {
    if (message.audio || !message.text.trim()) return [];
    const voiceId = project.participants.find(person => person.role === message.senderId)?.voiceId ?? "";
    return messageAudioHint(message.text, voiceId) ? [] : [{ message, voiceId, index }];
  });

  async function generateAudio() {
    if (progress || !pending.length) return;
    setBatchError("");
    const failures: string[] = [];
    for (const [i, { message, voiceId, index }] of pending.entries()) {
      setProgress(`Generating ${i + 1} of ${pending.length}…`);
      try {
        const { assetId, durationSeconds } = await generateMessageAudio(message.text, voiceId, project.audio.speech);
        update(current => attachMessageAudio(current, message.id, message.text, voiceId, { assetId, durationSeconds }, project.audio.speech));
      } catch (cause) {
        failures.push(`Message ${index + 1}: ${cause instanceof Error ? cause.message : "Audio generation failed."}`);
      }
    }
    setBatchError(failures.join(" "));
    setProgress("");
  }

  function editMessage(id: string, change: Partial<Message>) {
    update((current) => ({
      ...current,
      messages: current.messages.map((message) => message.id === id ? { ...message, ...change, audio: undefined } : message),
    }));
  }

  function addMessage() {
    update((current) => ({
      ...current,
      messages: [
        ...current.messages,
        { id: crypto.randomUUID(), senderId: current.participants[current.messages.length % 2].role, text: "" },
      ],
    }));
  }

  return (
    <div className="grid gap-4">
      <div role="region" aria-label="Conversation messages" className="h-[min(56dvh,36rem)] min-w-0 overflow-y-auto overscroll-contain p-1">
      {project.messages.length === 0 && (
        <div className="grid place-items-center gap-2 rounded-lg border border-dashed p-8 text-center">
          <MessageSquare className="size-5 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">No messages yet</p>
        </div>
      )}
      {project.messages.length > 0 && (
        <Sortable
          value={project.messages}
          getItemValue={(message) => message.id}
          onValueChange={(messages) => update((current) => ({ ...current, messages }))}
          className="grid gap-4"
        >
          {project.messages.map((message, index) => {
            const voiceId = project.participants.find(person => person.role === message.senderId)?.voiceId ?? "";
            return (
            <SortableItem key={message.id} value={message.id}>
              <Card size="sm" className="bg-background/40">
                <CardContent className="grid gap-3">
                  <div className="flex items-center gap-3">
                    <SortableItemHandle
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                      aria-label={`Reorder message ${index + 1}`}
                    >
                      <GripVertical aria-hidden="true" />
                    </SortableItemHandle>
                    <Label className="shrink-0" htmlFor={`sender-${message.id}`}>Sender</Label>
                    <NativeSelect
                      id={`sender-${message.id}`}
                      className="min-w-0 flex-1"
                      value={message.senderId}
                      onChange={(event) => editMessage(message.id, { senderId: event.target.value })}
                    >
                      {project.participants.map((participant) => (
                        <NativeSelectOption key={participant.role} value={participant.role}>
                          {participant.displayName.trim() || participantLabel(participant)}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove message ${index + 1}`}
                      onClick={() => update((current) => ({
                        ...current,
                        messages: current.messages.filter(({ id }) => id !== message.id),
                      }))}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                  <Textarea
                    aria-label={`Message ${index + 1}`}
                    placeholder="Write a message…"
                    value={message.text}
                    onChange={(event) => editMessage(message.id, { text: event.target.value })}
                  />
                  <MessageAudioControl
                    key={JSON.stringify([message.text, message.senderId, voiceId, project.audio.speech])}
                    settings={project.audio.speech}
                    text={message.text}
                    voiceId={voiceId}
                    audio={message.audio}
                    onSave={reference => update(current => attachMessageAudio(current, message.id, message.text, voiceId, reference, project.audio.speech))}
                  />
                </CardContent>
              </Card>
            </SortableItem>
            );
          })}
        </Sortable>
      )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={addMessage}>
          <Plus aria-hidden="true" /> Add message
        </Button>
        <Button disabled={!!progress || !pending.length} onClick={() => void generateAudio()}>
          <AudioLines aria-hidden="true" /> {progress || "Generate Audio"}
        </Button>
      </div>
      {batchError && <p role="alert" className="text-sm text-destructive">{batchError}</p>}
    </div>
  );
}

function MessageTransitionPreview({ durationMs, easing }: { durationMs: number; easing: MessageEasing }) {
  const reveal = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cycleMs = 1400 + durationMs;
    const animation = reveal.current?.animate([
      { height: "0px", offset: 0 },
      { height: "0px", offset: 500 / cycleMs, easing: `cubic-bezier(${messageEasings[easing].points.join(",")})` },
      { height: "1.25rem", offset: (500 + durationMs) / cycleMs },
      { height: "1.25rem", offset: 1 },
    ], { duration: cycleMs, iterations: Infinity });
    return () => animation?.cancel();
  }, [durationMs, easing]);

  return (
    <div aria-hidden="true" className="h-24 rounded-md bg-slate-800 p-3">
      <div className="overflow-hidden rounded-md bg-slate-950">
        <div className="p-2">
          <div className="h-3 w-2/3 rounded-md bg-slate-500" />
        </div>
        <div ref={reveal} className="overflow-hidden">
          <div className="ml-auto mr-2 mb-2 h-3 w-1/2 rounded-md bg-sky-400" />
        </div>
      </div>
    </div>
  );
}

function AppearancePanel({ project, update }: EditorProps) {
  const selected = project.appearence.chatPosition ?? "top";
  const width = project.appearence.chatWidth ?? 100;
  const header = project.appearence.contactHeader ?? "first";
  const transitionMs = project.appearence.messageTransitionMs ?? defaultMessageTransitionMs;
  const easing = project.appearence.messageEasing ?? defaultMessageEasing;
  return (
    <div className="grid max-w-md gap-6">
      <fieldset className="min-w-0">
        <legend className="mb-3 text-sm font-medium">Chat position</legend>
        <div className="grid grid-cols-3 gap-2">
          {(["top", "center", "bottom"] as const).map(position => (
            <Button key={position} variant="outline" aria-pressed={selected === position}
              className="h-auto min-w-0 flex-col gap-2 rounded-xl py-3 aria-pressed:border-primary dark:aria-pressed:border-primary"
              onClick={() => update(current => ({ ...current, appearence: { ...current.appearence, chatPosition: position } }))}>
              <span aria-hidden="true" className="relative flex aspect-[9/16] w-full max-w-14 overflow-hidden rounded-md bg-slate-800 px-1 py-2 ring-1 ring-white/10"
                style={{ alignItems: { top: "flex-start", center: "center", bottom: "flex-end" }[position] }}>
                <span className="absolute inset-x-0 bottom-0 h-1/4 -skew-y-12 bg-teal-900" />
                <span className="absolute -right-2 bottom-0 h-2/5 w-2/3 skew-y-12 bg-teal-800" />
                <span style={{ width: `${width}%` }} className="relative mx-auto flex flex-col gap-1 rounded bg-slate-950 p-1 shadow-sm">
                  <span className="h-1 w-2/3 rounded-sm bg-slate-400" />
                  <span className="h-1 w-1/2 self-end rounded-sm bg-sky-400" />
                </span>
              </span>
              {position === "center" ? "Centre" : position === "top" ? "Top" : "Bottom"}
            </Button>
          ))}
        </div>
      </fieldset>
      <fieldset className="min-w-0">
        <legend className="mb-3 text-sm font-medium">Contact header</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["first", "always"] as const).map(mode => (
            <Button key={mode} variant="outline" aria-pressed={header === mode}
              className="h-auto min-w-0 flex-col gap-2 rounded-xl py-3 whitespace-normal aria-pressed:border-primary dark:aria-pressed:border-primary"
              onClick={() => update(current => ({ ...current, appearence: { ...current.appearence, contactHeader: mode } }))}>
              <span aria-hidden="true" className="grid w-full max-w-36 grid-cols-2 items-end gap-1.5">
                {[0, 1].map(group => (
                  <span key={group} className="flex h-14 min-w-0 flex-col overflow-hidden rounded-md bg-slate-950 ring-1 ring-slate-400/30">
                    {(group === 0 || mode === "always") && (
                      <span className="flex items-center gap-1 bg-slate-800 px-1.5 py-1">
                        <span className="size-2 shrink-0 rounded-full bg-slate-400" />
                        <span className="h-1 w-1/2 rounded-full bg-slate-500" />
                      </span>
                    )}
                    <span className="flex flex-col gap-1 p-1.5">
                      <span className="h-1 w-3/4 rounded-sm bg-slate-400" />
                      <span className="h-1 w-1/2 self-end rounded-sm bg-sky-400" />
                    </span>
                  </span>
                ))}
              </span>
              {mode === "first" ? "First group only" : "Every group"}
            </Button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-2">
        <div className="flex items-center justify-between text-sm font-medium">
          <span>Chat width</span><span className="tabular-nums text-muted-foreground">{width}%</span>
        </div>
        <Slider min={60} max={100} step={1} value={[width]} getAriaLabel={() => "Chat width"}
          getAriaValueText={(_, value) => `${value}%`} className="[&>div]:min-h-7"
          onValueChange={selection => {
            const chatWidth = typeof selection === "number" ? selection : selection[0];
            update(current => ({ ...current, appearence: { ...current.appearence, chatWidth } }));
          }} />
      </div>
      <Card size="sm" className="bg-background/40">
        <CardContent className="grid gap-3">
          <div className="flex items-center justify-between gap-2 text-sm font-medium">
            <span>Message transition</span>
            <span className="tabular-nums text-muted-foreground">{transitionMs} ms</span>
          </div>
          <Slider min={0} max={maxMessageTransitionMs} step={100} value={[transitionMs]}
            getAriaLabel={() => "Message transition duration"}
            getAriaValueText={(_, value) => `${value} milliseconds`} className="[&>div]:min-h-7"
            onValueChange={selection => {
              const messageTransitionMs = typeof selection === "number" ? selection : selection[0];
              update(current => ({ ...current, appearence: { ...current.appearence, messageTransitionMs } }));
            }} />
          <fieldset className="min-w-0">
            <legend className="mb-2 text-sm font-medium">Easing curve</legend>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(messageEasings) as MessageEasing[]).map(value => {
                const { label, points: [x1, y1, x2, y2] } = messageEasings[value];
                return (
                  <Button key={value} variant="outline" aria-pressed={easing === value}
                    className="h-auto flex-col gap-1.5 py-2 aria-pressed:border-primary dark:aria-pressed:border-primary"
                    onClick={() => update(current => ({ ...current, appearence: { ...current.appearence, messageEasing: value } }))}>
                    <svg aria-hidden="true" viewBox="0 0 56 40" className="size-12" fill="none">
                      <path d="M4 4V36H52" stroke="currentColor" className="text-muted-foreground/50" />
                      <path d={`M4 36 C${4 + 48 * x1} ${36 - 32 * y1} ${4 + 48 * x2} ${36 - 32 * y2} 52 4`}
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    {label}
                  </Button>
                );
              })}
            </div>
          </fieldset>
          <div className="max-w-48">
            <MessageTransitionPreview durationMs={transitionMs} easing={easing} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function speechPresetLabel(value: string) {
  if (value === "medium") return "Normal";
  const label = value.replace("x-", "very ");
  return label[0].toUpperCase() + label.slice(1);
}

function AudioPanel({ project, update }: EditorProps) {
  const settings = project.audio.speech ?? defaultSpeechSettings;
  const labels = { rate: "Speaking speed", pitch: "Pitch", volume: "Volume" };
  return (
    <div className="grid max-w-sm gap-2">
      <Label htmlFor="voiceover">Voiceover</Label>
      <NativeSelect
        id="voiceover"
        className="w-full"
        value={project.audio.voiceover === false ? "off" : "on"}
        onChange={(event) => {
          const voiceover = event.target.value === "on";
          update((current) => ({ ...current, audio: { ...current.audio, voiceover } }));
        }}
      >
        <NativeSelectOption value="off">Off</NativeSelectOption>
        <NativeSelectOption value="on">On</NativeSelectOption>
      </NativeSelect>
      <Card size="sm" className="mt-3 bg-background/40">
        <CardContent className="grid gap-5">
          {(["rate", "pitch", "volume"] as const).map(field => {
            const presets = speechPresets[field];
            const max = presets.length - 1;
            const selected = presets.indexOf(settings[field]);
            return (
              <div key={field} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{labels[field]}</span>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">{speechPresetLabel(settings[field])}</span>
                </div>
                <Slider
                  value={[selected]}
                  max={max}
                  step={1}
                  getAriaLabel={() => labels[field]}
                  getAriaValueText={(_, index) => speechPresetLabel(presets[index])}
                  className="[&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-thumb]]:size-4 [&>div]:min-h-7"
                  onValueChange={selection => {
                    const index = typeof selection === "number" ? selection : selection[0];
                    const value = presets[index];
                    update(current => {
                      const speech = current.audio.speech ?? defaultSpeechSettings;
                      if (speech[field] === value) return current;
                      return {
                        ...current,
                        audio: { ...current.audio, speech: { ...speech, [field]: value } },
                        messages: current.messages.map(message => message.audio ? { ...message, audio: undefined } : message),
                      };
                    });
                  }}
                />
                <div aria-hidden="true" className="flex justify-between text-xs text-muted-foreground">
                  <span>{speechPresetLabel(presets[0])}</span>
                  <span>{speechPresetLabel(presets[max])}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">These settings apply to both voices. After a change, select Generate Audio in Conversation to update the clips.</p>
    </div>
  );
}

const panels = {
  participants: ParticipantsPanel,
  conversation: ConversationPanel,
  appearance: AppearancePanel,
  audio: AudioPanel,
};

export function FakeTextEditor({ project, update, backgrounds }: EditorProps & { backgrounds: BackgroundClip[] }) {
  const [activeItem, setActiveItem] = useState<EditorSection>("conversation");
  const Panel = activeItem === "background" ? null : panels[activeItem];
  const legacyClip = project.background.source === "minecraft" && backgrounds.find((clip) => clip.name === "bg1.mp4");
  const background = legacyClip
    ? { ...legacyClip, source: "library" as const, crop: centeredBackgroundCrop }
    : project.background;
  const reel = useReel(project, "crop" in background ? background : null);

  return (
    <EditorLayout
      name={project.name}
      onRename={(name) => update((current) => ({ ...current, name }))}
      sections={sections}
      activeItem={activeItem}
      onSelect={(id) => {
        const item = sidebarItems.find((item) => item.id === id);
        if (item) setActiveItem(item.id);
      }}
      heading={sidebarItems.find((item) => item.id === activeItem)!.label}
      description={descriptions[activeItem]}
      {...reel}
    >
      {Panel ? <Panel project={project} update={update} /> : (
        <BackgroundPanel
          background={background}
          clips={backgrounds}
          onChange={(background) => update((current) => ({ ...current, background }))}
        />
      )}
    </EditorLayout>
  );
}
