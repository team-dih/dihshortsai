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

Copy `server/.env.example` to `server/.env` and set `SPEECHIFY_KEY` and `CLIENT_ORIGIN` there. `CLIENT_ORIGIN` is a comma-separated allow-list of client origins, such as `http://localhost:3000` locally or the deployed client URL. This secret belongs only to the server and should never be set in the client project. Run `bun run dev` from both `server` and `client` during development. The client proxies `POST /api/speech` to the Express server on port 3001; configure `API_SERVER_ORIGIN` separately in the client environment if the server runs elsewhere.

In Vercel, set `SPEECHIFY_KEY` and `CLIENT_ORIGIN` in the **server project's** Environment Variables. Set `API_SERVER_ORIGIN` separately in the client project's Environment Variables to the deployed server's origin. CORS is configured for direct browser requests; the Next.js rewrite remains same-origin to the browser.

The server emits one structured JSON request log per completed request. The client Next.js proxy adds parsed user-agent and Vercel location metadata to `/api/*` requests; static assets are outside that logging path. Location and device/browser details are estimates from request headers. Set `LOG_RAW_IP=true` in the server environment to retain full IPs; the default `false` masks IPv4 addresses to `/24` and IPv6 addresses to `/64`. No request bodies, query strings, cookies, authorization headers, or tokens are logged. This app has no authentication context yet, so logs do not include a user ID.

The editor stores each generated WAV file in IndexedDB. A message's optional `audio` field contains its stable `assetId` and `durationSeconds`. Consumers can use `readMessageAudio(assetId)` to retrieve the local blob without requesting synthesis.

Run the server checks with `bun test` and `bun run typecheck`. For the editor workflow, run `bun run build` and `bun run playwright test` from `client` with Playwright Chromium installed, or set `PLAYWRIGHT_CHANNEL=msedge` to use an installed Edge browser.

To type check:

```bash
bun check
```

Run `bun fmt` to format the code.

This project was created using `bun init` in bun v1.4.4. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
