# server

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

## Speechify

Set `SPEECHIFY_KEY` in `server/.env`. Run `bun run dev` from both `server` and `client` during development. The editor proxies `POST /api/speech` to the Express server on port 3001. If Express runs elsewhere, set `API_SERVER_ORIGIN` in the client environment before starting or building Next.js.

The editor stores each generated WAV file in IndexedDB. A message's optional `audio` field contains its stable `assetId` and `durationSeconds`. Consumers can use `readMessageAudio(assetId)` to retrieve the local blob without requesting synthesis.

Run the server checks with `bun test` and `bun run typecheck`. For the editor workflow, run `bun run build` and `bun run playwright test` from `client` with Playwright Chromium installed, or set `PLAYWRIGHT_CHANNEL=msedge` to use an installed Edge browser.

To type check:

```bash
bun check
```

Run `bun fmt` to format the code.

This project was created using `bun init` in bun v1.4.4. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
