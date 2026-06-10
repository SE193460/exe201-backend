import { Request, Response } from "express";
import { pool } from "../config/db";
import { createReport, listReports } from "../repositories/reportRepository";

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