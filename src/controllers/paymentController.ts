import { Request, Response } from "express";
import { createTransaction, listTransactionsByUser, listAllTransactions } from "../repositories/paymentRepository";
import { pool } from "../config/db";

export async function checkout(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { listingId, packageName, amount } = req.body;
  if (!listingId || !packageName || typeof amount !== "number") {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // 1. Verify listing ownership and check if it exists
    const listingRes = await pool.query(
      "SELECT * FROM listings WHERE id = $1 AND owner_id = $2",
      [listingId, userId]
    );
    if (listingRes.rowCount === 0) {
      return res.status(404).json({ message: "Listing not found or access denied" });
    }

    // 2. Update listing to set status = 'APPROVED' and published_at = NOW() (to push it to the top)
    await pool.query(
      `UPDATE listings
       SET status = 'APPROVED', published_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [listingId]
    );

    // 3. Save the transaction in the database
    const transaction = await createTransaction({
      userId,
      listingId,
      amount,
      packageName,
      status: "COMPLETED",
    });

    return res.status(201).json({
      message: "Thanh toán thành công và đẩy bài đăng thành công!",
      transaction,
    });
  } catch (error) {
    console.error("Payment checkout error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getMyHistory(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

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
