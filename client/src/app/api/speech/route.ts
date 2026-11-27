import { NextRequest, userAgent } from "next/server";

async function forwardSpeechRequest(request: NextRequest): Promise<Response> {
  const parsed = userAgent(request);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("connection");
  headers.delete("transfer-encoding");
  headers.delete("x-app-reported-ip");

  headers.set("x-app-reported-client", JSON.stringify({
    isBot: parsed.isBot,
    browser: parsed.browser,
    engine: parsed.engine,
    os: parsed.os,
    device: parsed.device,
  }));
  headers.set("x-app-vercel-location", JSON.stringify({
    country: request.headers.get("x-vercel-ip-country"),
    continent: request.headers.get("x-vercel-ip-continent"),
    region: request.headers.get("x-vercel-ip-country-region"),
    city: request.headers.get("x-vercel-ip-city"),
    timezone: request.headers.get("x-vercel-ip-timezone"),
  }));
  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  if (process.env.VERCEL === "1" && forwardedIp) headers.set("x-app-reported-ip", forwardedIp);
  headers.set("x-app-reported-protocol", request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", ""));

  const upstreamUrl = new URL("/api/speech", process.env.API_SERVER_ORIGIN ?? "http://127.0.0.1:3001");
  upstreamUrl.search = request.nextUrl.search;
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      signal: request.signal,
    });
    const responseHeaders = new Headers(upstream.headers);
    for (const name of ["connection", "keep-alive", "transfer-encoding", "upgrade", "content-length"]) {
      responseHeaders.delete(name);
    }
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return Response.json({ error: "Speech service is temporarily unavailable." }, { status: 502 });
  }
}

export const GET = forwardSpeechRequest;
export const HEAD = forwardSpeechRequest;
export const POST = forwardSpeechRequest;
export const PUT = forwardSpeechRequest;
export const PATCH = forwardSpeechRequest;
export const DELETE = forwardSpeechRequest;
export const OPTIONS = forwardSpeechRequest;
