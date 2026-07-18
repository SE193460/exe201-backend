import type { Request, Response } from "express";
import https from "https";
import http from "http";
import { URL } from "url";

export function proxyImage(req: Request, res: Response) {
  const imageUrl = req.query.url as string;
  if (!imageUrl) {
    res.status(400).json({ error: "Missing url query parameter" });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
    if (!parsed.protocol.startsWith("http")) throw new Error();
  } catch {
    res.status(400).json({ error: "Invalid url" });
    return;
  }

  const client = parsed.protocol === "https:" ? https : http;

  client.get(
    imageUrl,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
        "Referer": "https://www.facebook.com/",
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
  ).on("error", (err) => {
    console.error("Image proxy error:", err.message);
    res.status(502).json({ error: "Failed to fetch image" });
  });
}
