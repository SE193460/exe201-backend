import { Request, Response } from "express";
import * as contactViewRepo from "../repositories/contactViewRepository";
import * as paymentRepo from "../repositories/paymentRepository";
import { pool } from "../config/db";
import { notifyAllAdmins } from "../repositories/notificationRepository";

export async function getMyCredits(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const credits = await contactViewRepo.getContactViewCredits(userId);
    res.json(credits);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function viewContact(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const { listingId } = req.params;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!listingId) return res.status(400).json({ error: "Missing listingId" });

    const success = await contactViewRepo.deductContactView(userId, listingId as string);
    if (!success) return res.status(403).json({ error: "Insufficient contact views", remaining: 0 });

    const result = await pool.query("SELECT owner_phone, owner_name FROM listings WHERE id = $1", [listingId as string]);
    const listing = result.rows[0];
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    res.json({
      success: true,
      phone: listing.owner_phone,
      name: listing.owner_name,
      message: "Contact view deducted",
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function purchaseContactViews(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { amount, packageName } = req.body;

    const transaction = await paymentRepo.createTransaction({
      userId,
      listingId: null,
      amount,
      packageName,
      status: "QR_GENERATED",
    });

    const qrContent = `ROOMIE_VIEW_#${transaction.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    const qrUrl = `https://img.vietqr.io/image/MOMO-0704542270-compact2.png?amount=${Math.abs(amount)}&addInfo=${encodeURIComponent(qrContent)}&accountName=Luong%20Anh%20Mai`;

    res.json({
      transactionId: transaction.id,
      qrUrl,
      content: qrContent,
      amount: Math.abs(amount),
      recipientInfo: {
        name: "Luong Anh Mai",
        phone: "0704542270",
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function confirmContactViewPurchase(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { amount, packageName } = req.body;

    const transaction = await paymentRepo.createTransaction({
      userId,
      listingId: null,
      amount,
      packageName,
      status: "PENDING",
    });

    await notifyAllAdmins({
      type: "new_pending_payment",
      title: "Yêu cầu mua lượt xem mới",
      message: `Người dùng đã chuyển khoản ${amount.toLocaleString()}đ cho gói "${packageName}" (mã: ${transaction.code}). Vui lòng kiểm tra và xác nhận.`,
      listingId: null,
    });

    res.json({ success: true, message: "Payment pending admin confirmation" });
  } catch (e: any) {
    console.error("confirmContactViewPurchase error:", e);
    res.status(500).json({ error: e.message });
  }
}

export async function adminAddContactViewCredits(req: Request, res: Response) {
  try {
    const { userId, views } = req.body;
    const result = await contactViewRepo.addContactViewCredits(userId, views);
    res.json({ success: true, remaining: result.remaining_views });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
