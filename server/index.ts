import "dotenv/config";
import { randomUUID } from "node:crypto";
import { isIP } from "node:net";
import cors from "cors";
import express from "express";
import type { Request } from "express";
import { speechRouter } from "./speech.ts";

const app = express();
const port = Number(process.env.PORT) || 3001;
const clientOrigins = (process.env.CLIENT_ORIGIN
  ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000"))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (clientOrigins.length === 0) {
  throw new Error("Set CLIENT_ORIGIN to the client app's origin(s), separated by commas.");
}

const retainRawIp = process.env.LOG_RAW_IP === "true";

function header(request: Request, name: string): string | null {
  const value = request.get(name)?.trim();
  return value || null;
}

function validIp(value: string | null): string | null {
  if (!value) return null;
  const ip = value.split(",", 1)[0]?.trim();
  return ip && isIP(ip) ? ip : null;
}

function decodedHeader(request: Request, name: string): string | null {
  const value = header(request, name);
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function decodeReportedValue(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function anonymizeIp(value: string | null): string | null {
  if (!value) return null;
  const ip = value.split(",", 1)[0]?.trim();
  if (!ip) return null;

  if (isIP(ip) === 4) return `${ip.split(".").slice(0, 3).join(".")}.0`;
  if (isIP(ip) !== 6) return null;
  const mappedIpv4 = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  const mappedAddress = mappedIpv4?.[1];
  if (mappedAddress) return `::ffff:${mappedAddress.split(".").slice(0, 3).join(".")}.0`;

  const [left = "", right = ""] = ip.split("::");
  const leftGroups = left ? left.split(":") : [];
  const rightGroups = right ? right.split(":") : [];
  const zeroGroups = Array(Math.max(0, 8 - leftGroups.length - rightGroups.length)).fill("0");
  return [...leftGroups, ...zeroGroups, ...rightGroups].slice(0, 4).join(":") + "::";
}

type ClientReport = {
  isBot?: boolean;
  browser?: { name?: string; version?: string };
  engine?: { name?: string; version?: string };
  os?: { name?: string; version?: string };
  device?: { type?: string; vendor?: string; model?: string };
};

type LocationReport = {
  country?: string | null;
  continent?: string | null;
  region?: string | null;
  city?: string | null;
  timezone?: string | null;
};

function readJsonHeader(request: Request, name: string): unknown {
  const value = header(request, name);
  if (!value || value.length > 4096) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" ? value.slice(0, 256) : undefined;
}

function readClientReport(request: Request): ClientReport | null {
  const parsed = record(readJsonHeader(request, "x-app-reported-client"));
  if (!parsed) return null;
  const browser = record(parsed.browser);
  const engine = record(parsed.engine);
  const os = record(parsed.os);
  const device = record(parsed.device);
  return {
    isBot: typeof parsed.isBot === "boolean" ? parsed.isBot : undefined,
    browser: browser ? { name: stringField(browser.name), version: stringField(browser.version) } : undefined,
    engine: engine ? { name: stringField(engine.name), version: stringField(engine.version) } : undefined,
    os: os ? { name: stringField(os.name), version: stringField(os.version) } : undefined,
    device: device ? {
      type: stringField(device.type),
      vendor: stringField(device.vendor),
      model: stringField(device.model),
    } : undefined,
  };
}

function readLocationReport(request: Request): LocationReport | null {
  const parsed = record(readJsonHeader(request, "x-app-vercel-location"));
  if (!parsed) return null;
  return {
    country: stringField(parsed.country) ?? null,
    continent: stringField(parsed.continent) ?? null,
    region: stringField(parsed.region) ?? null,
    city: stringField(parsed.city) ?? null,
    timezone: stringField(parsed.timezone) ?? null,
  };
}

function reportedCountryName(countryCode: string | null): string | null {
  if (!countryCode) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}

app.use(cors({ origin: clientOrigins }));
app.use((request, response, next) => {
  const requestId = randomUUID();
  const startedAt = performance.now();
  const timestamp = new Date().toISOString();
  response.setHeader("X-Request-Id", requestId);

  response.on("finish", () => {
    const vercelId = request.get("x-vercel-id");
    const forwardedIp = validIp(header(request, "x-forwarded-for"));
    const ip = validIp(header(request, "x-app-reported-ip"))
      ?? (vercelId && forwardedIp ? forwardedIp : validIp(request.socket.remoteAddress ?? null));
    const referrer = request.get("referer");
    const report = readClientReport(request);
    const locationReport = readLocationReport(request);
    let referrerOrigin: string | undefined;
    if (referrer) {
      try {
        referrerOrigin = new URL(referrer).origin;
      } catch {
        referrerOrigin = undefined;
      }
    }

    const countryCode = locationReport?.country ?? header(request, "x-vercel-ip-country");
    const deviceType = report?.device?.type;
    console.info(JSON.stringify({
      event: "http_request",
      request: {
        id: requestId,
        timestamp,
        method: request.method,
        path: request.path,
        protocol: header(request, "x-app-reported-protocol") ?? header(request, "x-forwarded-proto") ?? request.protocol,
        ip: retainRawIp ? ip : anonymizeIp(ip),
        ipRetention: retainRawIp ? "raw" : "anonymized",
        userAgent: header(request, "user-agent")?.slice(0, 512) ?? null,
        acceptLanguage: header(request, "accept-language")?.slice(0, 256) ?? null,
        origin: header(request, "origin"),
        referrerOrigin: referrerOrigin ?? null,
        fetch: {
          site: header(request, "sec-fetch-site"),
          mode: header(request, "sec-fetch-mode"),
          destination: header(request, "sec-fetch-dest"),
          user: header(request, "sec-fetch-user"),
        },
        browserHints: {
          brands: header(request, "sec-ch-ua"),
          mobile: header(request, "sec-ch-ua-mobile"),
          platform: header(request, "sec-ch-ua-platform"),
        },
        vercelId: vercelId ?? null,
      },
      location: {
        country: reportedCountryName(countryCode),
        countryCode,
        continent: locationReport?.continent ?? header(request, "x-vercel-ip-continent"),
        region: locationReport?.region ?? header(request, "x-vercel-ip-country-region"),
        city: decodeReportedValue(locationReport?.city) ?? decodedHeader(request, "x-vercel-ip-city"),
        timezone: locationReport?.timezone ?? header(request, "x-vercel-ip-timezone"),
        approximate: true,
      },
      browser: {
        name: report?.browser?.name ?? null,
        version: report?.browser?.version ?? null,
        reportedFromUserAgent: true,
        engine: {
          name: report?.engine?.name ?? null,
          version: report?.engine?.version ?? null,
        },
      },
      device: {
        type: deviceType === "mobile" || deviceType === "tablet" ? deviceType : "desktop",
        reportedType: deviceType ?? null,
        vendor: report?.device?.vendor ?? null,
        model: report?.device?.model ?? null,
        reported: true,
      },
      operatingSystem: {
        name: report?.os?.name ?? null,
        version: report?.os?.version ?? null,
        reportedFromUserAgent: true,
      },
      bot: { known: report?.isBot ?? null, basedOnReportedUserAgent: true },
      authentication: { userId: null },
      response: {
        status: response.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      },
      // No authentication context or internal user ID exists in this app yet.
    }));
  });

  next();
});
app.use(express.json());
app.use("/api/speech", speechRouter);

app.get("/", (_request, response) => {
  response.json({ message: "API server is running" });
});

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
