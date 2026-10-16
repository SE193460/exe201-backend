import type { Request, Response } from "express";
import https from "https";
import http from "http";
import { URL } from "url";
import { env } from "../config/env";

/**
 * Hosts the proxy is allowed to fetch from.
 * Configurable via IMAGE_PROXY_ALLOWED_HOSTS (comma-separated suffixes).
 * Defaults cover the intended use case (Facebook CDN images) and Cloudinary.
 */
const DEFAULT_ALLOWED_HOSTS = [
  "fbcdn.net",
  "facebook.com",
  "cloudinary.com",
];

function getAllowedHosts(): string[] {
  const fromEnv = env.imageProxyAllowedHosts;
  if (fromEnv) {
    return fromEnv
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean);
  }
  return DEFAULT_ALLOWED_HOSTS;
}

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return getAllowedHosts().some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

function isIpLiteral(hostname: string): boolean {
  // IPv4, IPv6 (bracketed by URL) or a plain hostname that is actually an IP.
  return (
    /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) ||
    hostname.includes(":") ||
    hostname.startsWith("[")
  );
}

export function proxyImage(req: Request, res: Response) {
  const imageUrl = req.query.url as string;
  if (!imageUrl) {
    res.status(400).json({ error: "Missing url query parameter" });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    res.status(400).json({ error: "Invalid url" });
    return;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    res.status(400).json({ error: "Invalid url" });
    return;
  }

  // Block IP literals and hosts not on the allowlist to prevent SSRF
  // (e.g. http://169.254.169.254/, http://localhost, http://10.0.0.1).
  if (isIpLiteral(parsed.hostname) || !isAllowedHost(parsed.hostname)) {
    res.status(403).json({ error: "Host not allowed" });
    return;
  }

  const client = parsed.protocol === "https:" ? https : http;

  const proxyReq = client.get(
    imageUrl,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
        Referer: "https://www.facebook.com/",
        "Sec-Fetch-Site": "cross-site",
      },
      timeout: 15000,
    },
    (proxyRes) => {
      const contentType = proxyRes.headers["content-type"] || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("timeout", () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.status(504).json({ error: "Upstream timeout" });
    }
  });

  proxyReq.on("error", (err) => {
    console.error("Image proxy error:", err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: "Failed to fetch image" });
    }
  });
}
