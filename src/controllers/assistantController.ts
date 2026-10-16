import type { Request, Response } from "express";
import {
  answerAssistant,
  type AssistantMessage,
} from "../services/assistantService";

const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 2000;

function parseMessages(raw: unknown): AssistantMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const messages: AssistantMessage[] = [];
  for (const item of raw.slice(-MAX_MESSAGES)) {
    if (!item || typeof item !== "object") return null;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || !content.trim()) return null;
    messages.push({ role, content: content.slice(0, MAX_MESSAGE_LENGTH) });
  }

  if (!messages.some((message) => message.role === "user")) return null;
  return messages;
}

/**
 * POST /api/assistant/chat
 * Body: { messages: [{ role: "user" | "assistant", content: string }] }
 * Returns: { reply: string, source: "llm" | "offline" }
 */
export async function chat(req: Request, res: Response): Promise<void> {
  const messages = parseMessages(req.body?.messages);

  if (!messages) {
    res.status(400).json({
      message: "messages must be a non-empty array of { role, content } with at least one user message",
    });
    return;
  }

  try {
    const result = await answerAssistant(messages);
    res.json(result);
  } catch (error) {
    console.error("Assistant chat failed:", error);
    res.status(502).json({ message: "The assistant is temporarily unavailable. Please try again." });
  }
}
