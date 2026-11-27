export const speechModel = "simba-3.5";
export const maxSpeechCharacters = 2000;

const speechPresets = {
  rate: ["x-slow", "slow", "medium", "fast", "x-fast"],
  pitch: ["x-low", "low", "medium", "high", "x-high"],
  volume: ["x-soft", "soft", "medium", "loud", "x-loud"],
};

export type SpeechSettings = Record<keyof typeof speechPresets, string>;
export const defaultSpeechSettings: SpeechSettings = { rate: "medium", pitch: "medium", volume: "medium" };

export function validSpeechSettings(value: unknown): value is SpeechSettings {
  if (!value || typeof value !== "object") return false;
  const settings = value as Partial<SpeechSettings>;
  return speechPresets.rate.includes(settings.rate ?? "") && speechPresets.pitch.includes(settings.pitch ?? "")
    && speechPresets.volume.includes(settings.volume ?? "");
}

export function sameSpeechSettings(a = defaultSpeechSettings, b = defaultSpeechSettings) {
  return a.rate === b.rate && a.pitch === b.pitch && a.volume === b.volume;
}

const voiceIds = ["carly", "kristy", "lisa", "alton", "anthony", "chase", "dorian"];

export function validVoice(id: unknown): boolean {
  return voiceIds.includes(id as string);
}
