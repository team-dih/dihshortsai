import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { templates } from "../src/lib/templates";
import { buildReelTimeline } from "../src/lib/reel-timeline";

test("page breaks follow measured bubble heights and narration frames", () => {
  const timeline = buildReelTimeline([
    { id: "a", text: "A\n".repeat(12), senderId: "outgoing", audio: { assetId: "a", durationSeconds: 1.01 } },
    { id: "b", text: "second", senderId: "incomming", audio: { assetId: "b", durationSeconds: 0.5 } },
    { id: "c", text: "C\n".repeat(20), senderId: "outgoing" },
  ], text => text.length * 20);
  expect(timeline.bubbles.slice(0, 2).map(({ from, page }) => [from, page])).toEqual([[6, 0], [37, 1]]);
  expect(timeline.narration[1]).toMatchObject({ from: 37, frames: 15 });
  expect(timeline.bubbles.slice(2).flatMap(b => b.lines)).toHaveLength(20);
  const messages = [{ id: "a", text: "Hello", senderId: "outgoing" }];
  expect(buildReelTimeline(messages, () => 100, 100, 0).bubbles[0].from).toBe(0);
  expect(buildReelTimeline(messages, () => 100, 100, 500).bubbles[0].from).toBe(15);
});

test("plays synchronized bubbles over gameplay and downloads a voiced MP4", async ({ page }) => {
  test.setTimeout(120_000);
  const project = templates["fake-text"].createProject();
  project.background = { source: "library", url: "/backgrounds/bg1.mp4", name: "bg1", crop: { zoom: 1, horizontal: 50, vertical: 50 } };
  project.messages = [["First bubble", ...Array(12).fill("Line")].join("\n"), "Second bubble"].map((text, i) => ({
    id: String(i), senderId: project.participants[i].role, text, audio: { assetId: "voice", durationSeconds: 0.5 },
  }));
  let speechRequests = 0;
  page.on("request", request => { if (request.url().endsWith("/api/speech")) speechRequests++; });
  await page.goto("/");
  await page.evaluate(async project => {
    localStorage.setItem("shorts-studio-projects", JSON.stringify({ version: 0, state: { projects: [{ templateId: "fake-text", project }] } }));
    const buffer = new ArrayBuffer(44 + 8000);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const tag = (at: number, text: string) => bytes.set(new TextEncoder().encode(text), at);
    tag(0, "RIFF"); tag(8, "WAVEfmt "); tag(36, "data");
    view.setUint32(4, buffer.byteLength - 8, true); view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 8000, true);
    view.setUint32(28, 16000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); view.setUint32(40, 8000, true);
    for (let i = 0; i < 4000; i++) view.setInt16(44 + i * 2, 3000 * Math.sin(i * 0.3), true);
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("shorts-studio-media", 2);
      req.onupgradeneeded = () => { req.result.createObjectStore("speech"); req.result.createObjectStore("backgrounds"); };
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const tx = req.result.transaction("speech", "readwrite");
        tx.objectStore("speech").put({ blob: new Blob([buffer], { type: "audio/wav" }), durationSeconds: 0.5, assetId: "voice" }, "voice");
        tx.oncomplete = () => { req.result.close(); resolve(); };
      };
    });
  }, project);
  await page.goto(`/editor/${project.id}`);
  const preview = page.locator('[aria-labelledby="preview-heading"] [class*="aspect-"]');
  for (const viewport of [{ width: 390, height: 844 }, { width: 820, height: 1180 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    const bounds = await preview.boundingBox();
    expect(bounds!.width).toBeGreaterThan(300);
    expect(bounds!.width / bounds!.height).toBeCloseTo(9 / 16, 2);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    if (viewport.width === 1440) {
      const card = await page.locator('[aria-labelledby="preview-heading"]').boundingBox();
      expect(card!.width - bounds!.width).toBeCloseTo(32, 0);
      expect(bounds!.height).toBeCloseTo(900 - 112 * 16 / 9, 0);
      expect((await page.locator("main").boundingBox())!.width).toBeLessThanOrEqual(1152);
    }
  }
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await expect(page.getByRole("button", { name: "First group only" })).toHaveAttribute("aria-pressed", "true");
  const centre = page.getByRole("button", { name: "Centre", exact: true });
  await centre.click();
  await expect(centre).toHaveAttribute("aria-pressed", "true");
  const width = page.getByRole("slider", { name: "Chat width" });
  await width.press("Home");
  await expect(width).toHaveAttribute("aria-valuetext", "60%");
  const contactHeader = preview.getByText(project.participants[0].displayName, { exact: true });
  await expect(contactHeader).toBeVisible();
  await expect(preview.locator('[data-slot="card"]')).toHaveCSS("width", "636px");
  await page.getByRole("slider", { name: "Message transition duration" }).press("End");
  await expect(page.getByText("1000 ms", { exact: true })).toBeVisible();
  await preview.getByRole("button", { name: "Play video" }).click();
  await expect(page.getByText("First bubble", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("Second bubble", { exact: true }).last()).toBeVisible();
  await expect(contactHeader).toHaveCount(0);
  const everyGroup = page.getByRole("button", { name: "Every group" });
  await everyGroup.click();
  await expect(everyGroup).toHaveAttribute("aria-pressed", "true");
  await expect(contactHeader).toBeVisible();
  const download = page.waitForEvent("download", { timeout: 90_000 });
  await page.getByRole("button", { name: "Generate Video" }).click();
  const file = await Promise.race([download, page.locator('[role="status"]').filter({ hasText: /.+/ }).last().innerText({ timeout: 95_000 }).then(message => { throw new Error(message); })]);
  const path = await file.path();
  expect(file.suggestedFilename()).toBe(project.name + ".mp4");
  const mp4 = await readFile(path!);
  expect(mp4.includes(Buffer.from("ftyp"))).toBeTruthy();
  expect(mp4.includes(Buffer.from("vide"))).toBeTruthy();
  expect(mp4.includes(Buffer.from("soun"))).toBeTruthy();
  expect(speechRequests).toBe(0);
});

