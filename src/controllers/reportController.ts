import { Request, Response } from "express";
import { pool } from "../config/db";
import { createReport, listReports, updateReportStatus as updateReportStatusRepo } from "../repositories/reportRepository";

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

    const report =
        await createReport({

            reporterId: userId,
            listingId,
            reason

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

    await updateReportStatusRepo({ reportId: id, status });

    return res.json({ message: "Report status updated" });

}