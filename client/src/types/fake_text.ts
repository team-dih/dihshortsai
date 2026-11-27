import type { SpeechSettings } from "../lib/speech-config";

interface Participant {
    displayName: string,
    avater: string | null,
    role: "incomming" | "outgoing",
    voiceId: string,
    voiceSpeed: number
};

interface Message {
  id: string;
  senderId: string;
  text: string;
  audio?: MessageAudioRef;
}

export type MessageAudioRef = { assetId: string; durationSeconds: number };

export type BackgroundCrop = { zoom: number; horizontal: number; vertical: number };

export type BackgroundClip = { name: string; url: string };

export type BackgroundVideo =
    | ({ source: "library" } & BackgroundClip)
    | { source: "upload"; name: string; id: string };

type BackgroundSettings = { source?: "none" | "minecraft" } | (BackgroundVideo & { crop: BackgroundCrop });

interface AppearenceSettings {
    chatWidth?: number;
    chatPosition?: "top" | "center" | "bottom";
    contactHeader?: "first" | "always";
    messageTransitionMs?: number;
    messageEasing?: import("../lib/reel-timeline").MessageEasing;
};

interface AudioSettings {
    speech?: SpeechSettings;
    voiceover?: boolean;
};

export interface VideoProject {
    id: string,
    name: string,
    participants: [Participant, Participant],
    messages: Message[],
    background: BackgroundSettings,
    appearence: AppearenceSettings,
    audio: AudioSettings
};
