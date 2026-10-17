import { NextFunction, Request, Response } from "express";
import {
  answerAssistant,
  normalizeAssistantLocale,
  type AssistantMessage,
} from "../services/assistantService";

const MAX_MESSAGES = 12;

function parseMessages(input: unknown): AssistantMessage[] | null {
  if (!Array.isArray(input)) return null;
  const messages: AssistantMessage[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") return null;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || !content.trim()) return null;
    messages.push({ role, content: content.slice(0, 4000) });
  }
  return messages.length ? messages.slice(-MAX_MESSAGES) : null;
}

/**
 * POST /api/assistant/chat   (public)
 * Body: { messages: AssistantMessage[], language?: "vi" | "en" | "ja" }
 * Returns: { reply, source, language }
 */
export async function chat(req: Request, res: Response, next: NextFunction) {
  try {
    const messages = parseMessages(req.body?.messages);
    if (!messages) {
      return res.status(400).json({ error: "messages must be a non-empty array of { role, content }" });
    }
    const language = normalizeAssistantLocale(req.body?.language);
    const result = await answerAssistant(messages, language);
    return res.json(result);
  } catch (e) {
    return next(e);
  }
}
