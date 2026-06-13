import { Request, Response } from "express";
import { pool } from "../config/db";
import { createReport, listReports, updateReportStatus as updateReportStatusRepo } from "../repositories/reportRepository";
import { createNotification, notifyAllAdmins } from "../repositories/notificationRepository";

export async function submitReport(
    req: Request,
    res: Response
) {

    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    const {
        listingId,
        reason
    } = req.body;

    const report = await createReport({
        reporterId: userId,
        listingId,
        reason
    });

    // Get listing title
    const listingRes = await pool.query<{ title: string }>(
        "SELECT title FROM listings WHERE id = $1",
        [listingId]
    );
    const listingTitle = listingRes.rows[0]?.title || "Bài đăng";

    // Notify all admins about the new report
    await notifyAllAdmins({
        type: "new_report",
        title: "Báo cáo vi phạm mới",
        message: `Bài đăng "${listingTitle}" bị báo cáo vì: ${reason}`,
        listingId,
    });

    return res.status(201).json(report);

}

export async function getReports(
    req: Request,
    res: Response
) {

    const reports =
        await listReports();

    return res.json(reports);

}

export async function resolveReport(
    req: Request,
    res: Response
) {

    const id = req.params.id as string;
    const { status } = req.body;

    if (!status || !["RESOLVED", "DISMISSED"].includes(status)) {
        return res.status(400).json({ message: "Status must be RESOLVED or DISMISSED" });
    }

    // Reject listing + notify owner if RESOLVED (errors won't block report update)
    if (status === "RESOLVED") {
        try {
            const reportRes = await pool.query<{
                id: string;
                listing_id: string;
                reason: string;
                reporter_id: string;
            }>("SELECT id, listing_id, reason, reporter_id FROM listing_reports WHERE id = $1", [id]);

            if (reportRes.rows.length > 0) {
                const report = reportRes.rows[0];
                const listingRes = await pool.query<{ owner_id: string; title: string }>(
                    "SELECT owner_id, title FROM listings WHERE id = $1",
                    [report.listing_id]
                );

                if (listingRes.rows.length > 0) {
                    const listing = listingRes.rows[0];
                    const rejectionReason = `Bài đăng bị báo cáo vi phạm: ${report.reason}`;
                    await pool.query(
                        `UPDATE listings SET status = 'REJECTED', rejection_reason = $1, updated_at = NOW() WHERE id = $2`,
                        [rejectionReason, report.listing_id]
                    );

                    // Notify owner
                    try {
                        await createNotification({
                            userId: listing.owner_id,
                            type: "listing_reported",
                            title: "Bài đăng bị gỡ xuống do vi phạm",
                            message: `Bài đăng "${listing.title}" đã bị gỡ xuống vì: ${report.reason}`,
                            listingId: report.listing_id,
                        });
                    } catch { /* swalow notification error */ }
                }
            }
        } catch (e) {
            console.error("resolveReport listing rejection error:", e);
        }
    }

    // Notify reporter about resolution (if they exist)
    try {
        const reportRes = await pool.query<{ reporter_id: string; listing_id: string }>(
            "SELECT reporter_id, listing_id FROM listing_reports WHERE id = $1",
            [id]
        );
        if (reportRes.rows.length > 0 && reportRes.rows[0].reporter_id) {
            const listingTitleRes = await pool.query<{ title: string }>(
                "SELECT title FROM listings WHERE id = $1",
                [reportRes.rows[0].listing_id]
            );
            const listingTitle = listingTitleRes.rows[0]?.title || "Bài đăng";
            const resolvedLabel = status === "RESOLVED" ? "đã được duyệt" : "đã được bỏ qua";
            await createNotification({
                userId: reportRes.rows[0].reporter_id,
                type: "report_resolved",
                title: `Báo cáo ${resolvedLabel}`,
                message: `Báo cáo bài đăng "${listingTitle}" ${resolvedLabel}.`,
                listingId: reportRes.rows[0].listing_id,
            });
        }
    } catch { /* swalow notification error */ }

    await updateReportStatusRepo({ reportId: id, status });

    return res.json({ message: "Report status updated" });

}