import { expect, test, spyOn } from "bun:test";
import express from "express";
import { once } from "node:events";
import { speechRouter } from "./speech";

test("speech endpoint validates input, protects credentials and returns WAV bytes", async () => {
  const app = express().use(express.json()).use("/api/speech", speechRouter);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No address");
  const originalKey = process.env.SPEECHIFY_KEY;
  const request = globalThis.fetch.bind(globalThis);
  const upstream = spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ audio_data: "UklGRg==" }));
  const post = (text: string, voiceId = "kristy", settings?: unknown) => request(`http://127.0.0.1:${address.port}/api/speech`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, voiceId, settings }),
  });
  try {
    delete process.env.SPEECHIFY_KEY;
    expect((await post("Hello")).status).toBe(503);
    process.env.SPEECHIFY_KEY = "test-token";
    for (const [text, voice] of [["", "carly"], ["test", "unknown"], ["a".repeat(2001), "dorian"]] as const) {
      expect((await post(text, voice)).status).toBe(400);
    }
    expect((await post("Hello", "carly", { rate: "unknown", pitch: "low", volume: "soft" })).status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
    const response = await post("A & B <3");
    expect(await response.text()).toBe("RIFF");
    expect(response.headers.get("content-type")).toContain("audio/wav");
    const [url, init] = upstream.mock.calls[0]!;
    expect(url).toBe("https://api.speechify.ai/v1/audio/speech");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer test-token");
    expect(JSON.parse(String(init?.body))).toMatchObject({ voice_id: "kristy", input: "<speak>A &amp; B &lt;3</speak>", output_format: "wav_48000" });
    await post("A & B", "carly", { rate: "fast", pitch: "low", volume: "soft" });
    expect(JSON.parse(String(upstream.mock.calls[1]?.[1]?.body)).input).toBe(
      '<speak><prosody rate="fast" pitch="low" volume="soft">A &amp; B</prosody></speak>'
    );
    upstream.mockResolvedValueOnce(new Response(null, { status: 429 }));
    expect((await post("Hello")).status).toBe(429);
  } finally {
    upstream.mockRestore();
    if (originalKey === undefined) delete process.env.SPEECHIFY_KEY;
    else process.env.SPEECHIFY_KEY = originalKey;
    server.close();
  }
});

