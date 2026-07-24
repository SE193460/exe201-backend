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

    const result = await pool.query(
      `SELECT u.phone_number AS phone, u.full_name AS owner_name
       FROM listings l
       JOIN users u ON u.id = l.owner_id
       WHERE l.id = $1`,
      [listingId as string]
    );
    const listing = result.rows[0];
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    res.json({
      success: true,
      phone: listing.phone,
      name: listing.owner_name,
      message: "Contact information is public",
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function viewLifestyleProfile(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const { listingId } = req.params;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!listingId) return res.status(400).json({ error: "Missing listingId" });

    const result = await contactViewRepo.revealOwnerLifestyleProfile(userId, listingId as string);
    if (result.insufficientViews) {
      return res.status(403).json({ error: "Insufficient contact views", remaining: 0 });
    }
    if (!result.profile) {
      return res.status(404).json({ error: "Lifestyle profile not found" });
    }

    return res.json({
      success: true,
      alreadyViewed: result.alreadyViewed,
      remainingViews: result.remainingViews,
      profile: result.profile,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}

export async function getLifestyleProfileAccess(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const { listingId } = req.params;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!listingId) return res.status(400).json({ error: "Missing listingId" });

    const viewed = await contactViewRepo.hasViewedListing(userId, listingId as string);
    if (!viewed) return res.json({ revealed: false });

    const result = await contactViewRepo.revealOwnerLifestyleProfile(userId, listingId as string);
    return res.json({ revealed: Boolean(result.profile), profile: result.profile, remainingViews: result.remainingViews });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}

export async function purchaseContactViews(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { amount, packageName } = req.body;

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }
    if (!packageName || typeof packageName !== "string") {
      return res.status(400).json({ error: "Invalid package name" });
    }

    const transaction = await paymentRepo.createTransaction({
      userId,
      listingId: null,
      amount,
      packageName,
      status: "QR_GENERATED",
    });

    const qrContent = `ROOMIE_${userId.slice(0, 8)}_${packageName.replace(/\s+/g, "_")}`;
    const qrUrl = `https://img.vietqr.io/image/MOMO-0704542270-compact2.png?amount=${Math.abs(amount)}&addInfo=${encodeURIComponent(qrContent)}&accountName=Luong%20Anh%20Mai`;

    res.json({
      transactionId: transaction.id,
      qrUrl,
      content: qrContent,
      code: qrContent,
      syntax: "Mã giao dịch",
      example: qrContent,
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
    const { transactionId } = req.body;
    if (!transactionId) return res.status(400).json({ error: "Missing transactionId" });

    const result = await pool.query(
      `UPDATE payment_transactions
       SET status = 'PENDING'
       WHERE id = $1 AND user_id = $2 AND status = 'QR_GENERATED'
       RETURNING *`,
      [transactionId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found or already confirmed" });
    }

    const txn = result.rows[0];
    const amount = txn.amount;
    const packageName = txn.package_name;

    await notifyAllAdmins({
      type: "new_pending_payment",
      title: "Yêu cầu mua lượt xem mới",
      message: `Người dùng đã chuyển khoản ${Number(amount).toLocaleString()}đ cho gói "${packageName}". Vui lòng kiểm tra và xác nhận.`,
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
