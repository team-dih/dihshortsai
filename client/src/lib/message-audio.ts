import { defaultSpeechSettings, maxSpeechCharacters, sameSpeechSettings, speechModel, validVoice, type SpeechSettings } from "./speech-config";
import type { MessageAudioRef, VideoProject } from "../types/fake_text";
import { runMediaTransaction } from "./media-store";

type AudioAsset = MessageAudioRef & { blob: Blob };

export function messageAudioHint(text: string, voiceId: string) {
  if (!validVoice(voiceId)) return "Choose a voice in Participants.";
  if (Array.from(text).length > maxSpeechCharacters) return "Shorten this message to 2,000 characters.";
  return "";
}

export function readMessageAudio(assetId: string): Promise<AudioAsset | undefined> {
  return runMediaTransaction("speech", "readonly", store => store.get(assetId));
}

export function attachMessageAudio(project: VideoProject, id: string, text: string, voiceId: string, audio: MessageAudioRef, settings = defaultSpeechSettings) {
  const message = project.messages.find(item => item.id === id);
  const voice = project.participants.find(person => person.role === message?.senderId)?.voiceId;
  if (!message || message.text !== text || voice !== voiceId || !sameSpeechSettings(settings, project.audio.speech)) return project;
  return { ...project, messages: project.messages.map(item => item === message ? { ...item, audio } : item) };
}

async function generate(assetId: string, text: string, voiceId: string, settings: SpeechSettings): Promise<AudioAsset> {
  const cached = await readMessageAudio(assetId);
  if (cached) return cached;
  const response = await fetch("/api/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voiceId, settings }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Could not generate audio. Check the server and try again.");
  }
  const blob = await response.blob();
  const context = new OfflineAudioContext(1, 1, 48000);
  const decoded = await context.decodeAudioData(await blob.arrayBuffer());
  if (!(decoded.duration > 0)) throw new Error("The generated clip is empty.");
  const asset = { assetId, durationSeconds: decoded.duration, blob };
  await runMediaTransaction("speech", "readwrite", store => store.put(asset, assetId));
  return asset;
}

const pending = new Map<string, Promise<AudioAsset>>();

export async function generateMessageAudio(text: string, voiceId: string, settings = defaultSpeechSettings) {
  const parts = ["speechify-wav-v1", speechModel, voiceId, text];
  if (!sameSpeechSettings(settings)) parts.push(settings.rate, settings.pitch, settings.volume);
  const signature = JSON.stringify(parts);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(signature));
  const assetId = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  const existing = pending.get(assetId);
  if (existing) return existing;
  // Coordinate identical requests across editor tabs when Web Locks is available.
  const work = Promise.resolve(navigator.locks
    ? navigator.locks.request(`speech-${assetId}`, () => generate(assetId, text, voiceId, settings))
    : generate(assetId, text, voiceId, settings));
  pending.set(assetId, work);
  try {
    return await work;
  } finally {
    pending.delete(assetId);
  }
}

