import { NextResponse, userAgent, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const parsed = userAgent(request);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-app-reported-client", JSON.stringify({
    isBot: parsed.isBot,
    browser: parsed.browser,
    engine: parsed.engine,
    os: parsed.os,
    device: parsed.device,
  }));
  requestHeaders.set("x-app-vercel-location", JSON.stringify({
    country: request.headers.get("x-vercel-ip-country"),
    continent: request.headers.get("x-vercel-ip-continent"),
    region: request.headers.get("x-vercel-ip-country-region"),
    city: request.headers.get("x-vercel-ip-city"),
    timezone: request.headers.get("x-vercel-ip-timezone"),
  }));
  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  if (forwardedIp) requestHeaders.set("x-app-reported-ip", forwardedIp);
  const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  requestHeaders.set("x-app-reported-protocol", protocol);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

// The Express API is the existing logging boundary. Static assets never enter it.
export const config = { matcher: ["/api/:path*"] };
