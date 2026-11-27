import { expect, test } from "@playwright/test";
import { templates } from "../src/lib/templates";

function oneSecondWav() {
  const wav = Buffer.alloc(44 + 16000);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(16000, 40);
  return wav;
}

test("batch generation reuses unchanged clips and retries only missing audio", async ({ page }) => {
  const project = templates["fake-text"].createProject();
  project.participants[0].voiceId = "carly";
  project.messages = ["First", "Second", ""].map((text, i) => ({ id: String(i), senderId: "incomming", text }));
  await page.goto("/");
  await page.evaluate(project => localStorage.setItem("shorts-studio-projects", JSON.stringify({
    version: 0, state: { projects: [{ templateId: "fake-text", project }] },
  })), project);
  const requests: string[] = [];
  await page.route("**/api/speech", route => {
    requests.push(route.request().postDataJSON().text);
    if (requests.length === 1) return route.fulfill({ status: 429, json: { error: "Try again later." } });
    return route.fulfill({ contentType: "audio/wav", body: oneSecondWav() });
  });
  await page.goto(`/editor/${project.id}`);
  const generate = page.getByRole("button", { name: "Generate Audio", exact: true });
  await generate.click();
  await expect(page.getByRole("alert").filter({ hasText: "Try again later." })).toBeVisible();
  await generate.click();
  await expect(generate).toBeDisabled();
  await page.getByRole("textbox", { name: "Message 2", exact: true }).fill("Edited");
  await generate.click();
  await expect(generate).toBeDisabled();
  expect(requests).toEqual(["First", "Second", "First", "Edited"]);
  await page.getByRole("button", { name: "Audio", exact: true }).click();
  const speed = page.getByRole("slider", { name: "Speaking speed" });
  const pitch = page.getByRole("slider", { name: "Pitch", exact: true });
  const volume = page.getByRole("slider", { name: "Volume", exact: true });
  await expect(speed).toHaveAttribute("aria-valuetext", "Very fast");
  await expect(pitch).toHaveAttribute("aria-valuetext", "High");
  await expect(volume).toHaveAttribute("aria-valuetext", "Normal");
  await speed.press("ArrowLeft");
  await expect(speed).toHaveAttribute("aria-valuetext", "Fast");
  await pitch.press("ArrowLeft");
  await volume.press("ArrowLeft");
  await page.reload();
  const request = page.waitForRequest(req => req.url().endsWith("/api/speech"));
  await generate.click();
  expect((await request).postDataJSON().settings).toEqual({ rate: "fast", pitch: "medium", volume: "soft" });
  await expect(generate).toBeDisabled();
  expect(requests.slice(4)).toEqual(["First", "Edited"]);
});

test("participant voices, explicit generation, stale responses and persistent cache", async ({ page }) => {
  const project = templates["fake-text"].createProject();
  await page.goto("/");
  await page.evaluate(project => localStorage.setItem("shorts-studio-projects", JSON.stringify({
    version: 0, state: { projects: [{ templateId: "fake-text", project }] },
  })), project);
  let calls = 0;
  let rejectNext = false;
  let release: (() => void) | undefined;
  await page.route("**/api/speech", async route => {
    calls++;
    const { voiceId, text } = route.request().postDataJSON();
    expect(voiceId).toEqual(text === "Other voice" ? "chase" : "carly");
    if (text === "Pending") await new Promise<void>(resolve => { release = resolve; });
    if (rejectNext) {
      rejectNext = false;
      return route.fulfill({ status: 429, json: { error: "Try again later." } });
    }
    await route.fulfill({ contentType: "audio/wav", body: oneSecondWav() });
  });
  await page.goto(`/editor/${project.id}`);
  const button = (name: string) => page.getByRole("button", { name, exact: true });
  await button("Participants").click();
  await button("Choose voice").first().click();
  await expect(page.locator("audio[src*=speechify]")).toHaveCount(3);
  await button("Carly").click();
  await button("Choose voice").click();
  await page.getByRole("tab", { name: "Male", exact: true }).click();
  await expect(page.locator("audio[src*=speechify]:visible")).toHaveCount(4);
  await button("Chase").click();
  await page.locator('[data-slot="dialog-trigger"]').filter({ hasText: /^Chase$/ }).click();
  await expect(page.getByRole("tab", { name: "Male", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Escape");
  await button("Conversation").click();
  await button("Add message").click();
  const text = page.getByRole("textbox", { name: "Message 1", exact: true });
  const generate = button("Generate audio");
  const player = page.locator('audio[aria-label="Generated message audio"]');
  await text.fill("Hello");
  expect(calls).toBe(0);
  rejectNext = true;
  await generate.click();
  await expect(page.getByRole("alert").filter({ hasText: "Try again later" })).toBeVisible();
  await generate.click();
  await expect(player).toBeVisible();
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("shorts-studio-projects")!).state.projects[0].project.messages[0].audio);
  const first = await saved();
  expect(first.durationSeconds).toBeCloseTo(1, 3);
  expect(first.assetId).toMatch(/^[a-f0-9]{64}$/);
  await page.reload();
  await expect(player).toBeVisible();
  await player.evaluate(async el => {
    const audio = el as HTMLAudioElement;
    audio.muted = true;
    await audio.play();
    audio.pause();
  });
  expect(calls).toBe(2);
  await text.fill("Pending");
  await generate.click();
  await expect.poll(() => Boolean(release)).toBe(true);
  await text.fill("Hello");
  release!();
  await generate.click();
  await expect(player).toBeVisible();
  expect(await saved()).toEqual(first);
  expect(calls).toBe(3);
  await button("Participants").click();
  await button("Carly").click();
  await button("Lisa").click();
  await button("Conversation").click();
  await expect(generate).toBeEnabled();
  expect(await saved()).toBeUndefined();
  await text.fill("Other voice");
  await page.getByLabel("Sender", { exact: true }).selectOption("outgoing");
  await generate.click();
  await expect(player).toBeVisible();
  expect(calls).toBe(4);
});

