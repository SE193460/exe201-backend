import { Request, Response } from "express";
import { createAnalyticsEvent, getAnalyticsOverview } from "../repositories/analyticsRepository";

export async function trackEvent(req: Request, res: Response) {
  try {
    const userId = req.user?.id ?? req.body?.userId ?? null;
    const payload = req.body || {};

    if (!payload.eventName) {
      return res.status(400).json({ message: "eventName is required" });
    }

    await createAnalyticsEvent({
      userId,
      eventName: payload.eventName,
      eventType: payload.eventType ?? "interaction",
      listingId: payload.listingId ?? null,
      district: payload.district ?? null,
      source: payload.source ?? null,
      metadata: payload.metadata ?? {},
    });

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error("Failed to track analytics event", error);
    return res.status(500).json({ message: "Failed to track analytics event" });
  }
}

export async function getAnalyticsSummary(req: Request, res: Response) {
  try {
    const summary = await getAnalyticsOverview();
    return res.json(summary);
  } catch (error) {
    console.error("Failed to load analytics summary", error);
    return res.status(500).json({ message: "Failed to load analytics summary" });
  }
}
