export const speechModel = "simba-3.5";
export const maxSpeechCharacters = 2000;

export const speechPresets = {
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

export const voices = [
  { id: "carly", name: "Carly", gender: "Female", preview: "59b12e39-dc58-4605-b325-1779d6c3fbd7" },
  { id: "kristy", name: "Kristy", gender: "Female", preview: "6413d62e-7fd7-4530-9644-2b8210e1cd39" },
  { id: "lisa", name: "Lisa", gender: "Female", preview: "cvl-lisa/en" },
  { id: "alton", name: "Alton", gender: "Male", preview: "7aca349c-3332-43da-9adb-1bb29d7eaabc" },
  { id: "anthony", name: "Anthony", gender: "Male", preview: "77f8736e-774f-42ad-85ef-295aee6bd1dd" },
  { id: "chase", name: "Chase", gender: "Male", preview: "b1897911-44fd-44f2-abe6-337a785ec73f" },
  { id: "dorian", name: "Dorian", gender: "Male", preview: "3bc834ec-2662-4a58-907e-1fab3582416b" },
] as const;

export function validVoice(id: unknown): boolean {
  return voices.some((voice) => voice.id === id);
}
