import { Request, Response } from "express";
import { createFeedback, listFeedbacksForAdmin } from "../repositories/feedbackRepository";

export async function submitFeedback(req: Request, res: Response) {
  const rawContent = req.body?.content;
  const content = typeof rawContent === "string" ? rawContent.trim() : "";

  if (!content) {
    return res.status(400).json({ message: "Nội dung góp ý không được để trống" });
  }

  if (content.length > 4000) {
    return res.status(400).json({ message: "Nội dung góp ý quá dài (tối đa 4000 ký tự)" });
  }

  const feedback = await createFeedback({
    userId: req.user?.id ?? null,
    content,
  });

  return res.status(201).json(feedback);
}

export async function getAdminFeedbacks(_req: Request, res: Response) {
  const feedbacks = await listFeedbacksForAdmin();
  return res.json(feedbacks);
}