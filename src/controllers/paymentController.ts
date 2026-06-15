import { Request, Response } from "express";
import { createTransaction, listTransactionsByUser, listAllTransactions, listPendingTransactions, PaymentTransactionRecord } from "../repositories/paymentRepository";
import { createPromotion } from "../repositories/promotionRepository";
import { createNotification, notifyAllAdmins } from "../repositories/notificationRepository";
import { sendInvoiceEmail } from "../services/emailService";
import { pool } from "../config/db";

const PACKAGE_CONFIG: Record<number, { type: string; label: string; durationDays: number }> = {
  5000: { type: "standard", label: "Gói 5.000đ", durationDays: 1 },
  15000: { type: "premium", label: "Gói 15.000đ", durationDays: 7 },
};

const TRANSFER_PREFIX: Record<number, string> = {
  5000: "ROOMIE5K_",
  15000: "ROOMIE15K_",
};

const MOMO_PHONE = "0704542270";
const MOMO_NAME = "Luong Anh Mai";

function shortCode(uuid: string): string {
  return "#" + uuid.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export async function generateQR(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { listingId, amount } = req.body;
  if (!listingId || typeof amount !== "number") {
    return res.status(400).json({ message: "Missing listingId or amount" });
  }

  const pkg = PACKAGE_CONFIG[amount];
  if (!pkg) {
    return res.status(400).json({ message: "Invalid package amount" });
  }

  try {
    // Cancel any existing QR_GENERATED transactions for this user+listing to avoid stale codes
    await pool.query(
      "UPDATE payment_transactions SET status = 'CANCELLED' WHERE user_id = $1 AND listing_id = $2 AND status = 'QR_GENERATED'",
      [userId, listingId]
    );

    // Create a QR_GENERATED transaction to reserve a unique code
    const transaction = await createTransaction({
      userId,
      listingId,
      amount,
      packageName: pkg.label,
      status: "QR_GENERATED",
    });

    const code = shortCode(listingId);
    const content = `${TRANSFER_PREFIX[amount]}${code}`;

    // VietQR — works with any banking app, recipient is Momo account
    const qrUrl = `https://img.vietqr.io/image/MOMO-${MOMO_PHONE}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(MOMO_NAME)}`;

    return res.json({
      qrUrl,
      recipientInfo: {
        name: MOMO_NAME,
        phone: MOMO_PHONE,
      },
      amount,
      content,
      code,
      syntax: `${TRANSFER_PREFIX[amount]}[Mã tin đăng]`,
      example: `ROOMIE5K_${code}`,
      packageType: pkg.type,
      packageLabel: pkg.label,
      durationDays: pkg.durationDays,
    });
  } catch (error) {
    console.error("Generate QR error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function confirmTransfer(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { listingId, amount, packageName } = req.body;
  if (!listingId || typeof amount !== "number" || !packageName) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const pkg = PACKAGE_CONFIG[amount];
  if (!pkg) {
    return res.status(400).json({ message: "Invalid package amount" });
  }

  try {
    // Verify listing ownership
    const listingRes = await pool.query(
      "SELECT * FROM listings WHERE id = $1 AND owner_id = $2",
      [listingId, userId]
    );
    if (listingRes.rowCount === 0) {
      return res.status(404).json({ message: "Listing not found or access denied" });
    }

    // Find the QR_GENERATED transaction created when QR was generated
    const qrTxnRes = await pool.query<PaymentTransactionRecord>(
      "SELECT * FROM payment_transactions WHERE user_id = $1 AND listing_id = $2 AND amount = $3 AND status = 'QR_GENERATED' ORDER BY created_at DESC LIMIT 1",
      [userId, listingId, amount]
    );

    let transaction: PaymentTransactionRecord;
    if (qrTxnRes.rows.length > 0) {
      // Promote existing QR_GENERATED to PENDING (keeps the same code)
      const updated = await pool.query<PaymentTransactionRecord>(
        "UPDATE payment_transactions SET status = 'PENDING' WHERE id = $1 RETURNING *",
        [qrTxnRes.rows[0].id]
      );
      transaction = updated.rows[0];
    } else {
      // Fallback: create a fresh PENDING transaction
      transaction = await createTransaction({
        userId,
        listingId,
        amount,
        packageName,
        status: "PENDING",
      });
    }

    // Notify admins about new pending payment
    await notifyAllAdmins({
      type: "new_pending_payment",
      title: "Yêu cầu thanh toán mới",
      message: `Người dùng đã chuyển khoản ${amount.toLocaleString()}đ cho gói "${packageName}" (mã: ${transaction.code}). Vui lòng kiểm tra và xác nhận.`,
      listingId,
    });

    return res.status(201).json({
      message: "Xác nhận chuyển khoản thành công. Vui lòng chờ admin xác nhận.",
      transaction,
    });
  } catch (error) {
    console.error("Confirm transfer error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function adminConfirmPayment(req: Request, res: Response) {
  const adminId = req.user?.id;
  if (!adminId) return res.status(401).json({ message: "Unauthorized" });

  const rawId = req.params.id;
  const transactionId = Array.isArray(rawId) ? rawId[0] : rawId;

  try {
    // Get transaction details
    const txnRes = await pool.query<{
      id: string;
      user_id: string;
      listing_id: string;
      amount: number;
      package_name: string;
    }>("SELECT * FROM payment_transactions WHERE id = $1", [transactionId]);

    if (txnRes.rows.length === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const txn = txnRes.rows[0];

    // Get listing details
    const listingRes = await pool.query<{ title: string; owner_id: string }>(
      "SELECT title, owner_id FROM listings WHERE id = $1",
      [txn.listing_id]
    );
    if (listingRes.rows.length === 0) {
      return res.status(404).json({ message: "Listing not found" });
    }

    const listing = listingRes.rows[0];

    // Get user info for email
    const userRes = await pool.query<{ email: string; full_name: string }>(
      "SELECT email, full_name FROM users WHERE id = $1",
      [txn.user_id]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRes.rows[0];
    const pkg = PACKAGE_CONFIG[txn.amount];

    if (!pkg) {
      return res.status(400).json({ message: "Invalid transaction amount" });
    }

    // Update transaction to COMPLETED
    await pool.query(
      "UPDATE payment_transactions SET status = 'COMPLETED' WHERE id = $1",
      [transactionId]
    );

    // Ensure listing is APPROVED
    await pool.query(
      `UPDATE listings SET status = 'APPROVED', published_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [txn.listing_id]
    );

    // Create promotion
    const expiresAt = new Date(Date.now() + pkg.durationDays * 86400000);
    await createPromotion({
      listingId: txn.listing_id,
      packageType: pkg.type,
      expiresAt,
    });

    // Notify user
    await createNotification({
      userId: txn.user_id,
      type: "payment_confirmed",
      title: "Thanh toán thành công",
      message: `Gói "${txn.package_name}" cho bài đăng "${listing.title}" đã được xác nhận. Bài đăng của bạn đang được ưu tiên hiển thị.`,
      listingId: txn.listing_id,
    });

    // Send invoice email
    try {
      await sendInvoiceEmail({
        to: user.email,
        userName: user.full_name,
        listingTitle: listing.title,
        packageName: txn.package_name,
        amount: txn.amount,
        transactionId: txn.id,
      });
    } catch {
      console.error("Failed to send invoice email");
    }

    return res.json({ message: "Payment confirmed, promotion activated, invoice sent" });
  } catch (error) {
    console.error("Admin confirm payment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getMyHistory(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const history = await listTransactionsByUser(userId);
    return res.json(history);
  } catch (error) {
    console.error("Fetch payment history error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getAllHistory(req: Request, res: Response) {
  try {
    const history = await listAllTransactions();
    return res.json(history);
  } catch (error) {
    console.error("Fetch all transactions error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getPendingPayments(req: Request, res: Response) {
  try {
    const pending = await listPendingTransactions();
    return res.json(pending);
  } catch (error) {
    console.error("Fetch pending payments error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
