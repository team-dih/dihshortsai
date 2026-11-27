import { Router } from "express";
import { defaultSpeechSettings, maxSpeechCharacters, sameSpeechSettings, speechModel, validSpeechSettings, validVoice } from "./speech-config.ts";

export const speechRouter = Router();

speechRouter.post("/", async (req, res) => {
  const { text, voiceId, settings = defaultSpeechSettings } = req.body ?? {};
  if (!validSpeechSettings(settings)) {
    res.status(400).json({ error: "Choose a supported speed, pitch and volume." });
    return;
  }
  if (!validVoice(voiceId) || typeof text !== "string" || !text.trim() || Array.from(text).length > maxSpeechCharacters) {
    res.status(400).json({ error: "Choose a voice and enter a message of up to 2,000 characters." });
    return;
  }
  const key = process.env.SPEECHIFY_KEY;
  if (!key) {
    res.status(503).json({ error: "Speechify is not configured on the server." });
    return;
  }
  try {
    const escaped = text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    const spoken = sameSpeechSettings(settings) ? escaped
      : `<prosody rate="${settings.rate}" pitch="${settings.pitch}" volume="${settings.volume}">${escaped}</prosody>`;
    const response = await fetch("https://api.speechify.ai/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input: `<speak>${spoken}</speak>`, voice_id: voiceId, model: speechModel, output_format: "wav_48000", language: "en-US" }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!response.ok) {
      const limited = response.status === 429;
      res.status(limited ? 429 : 502).json({ error: limited
        ? "Speechify's request limit was reached. Try again later."
        : `Speechify could not generate audio (HTTP ${response.status}).` });
      return;
    }
    const data = await response.json() as { audio_data?: string };
    if (!data.audio_data) throw new Error("Missing audio");
    res.set("Cache-Control", "no-store").type("audio/wav").send(Buffer.from(data.audio_data, "base64"));
  } catch {
    res.status(502).json({ error: "Could not get audio from Speechify. Try again." });
  }
});

