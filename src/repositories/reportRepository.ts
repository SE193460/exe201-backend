import { pool } from "../config/db";

export async function createReport({

    reporterId,
    listingId,
    reason

}: {

    reporterId: string;
    listingId: string;
    reason: string;

}) {

    const result = await pool.query(

        `
        INSERT INTO listing_reports
        (
            reporter_id,
            listing_id,
            reason
        )

        VALUES($1,$2,$3)

        RETURNING
        id,
        reporter_id as "reporterId",
        listing_id as "listingId",
        reason,
        status,
        created_at as "createdAt"
        `,
        [
            reporterId,
            listingId,
            reason
        ]

    );

    return result.rows[0];

}

export async function listReports() {

    const result = await pool.query(

        `
        SELECT

        lr.id,

        lr.reason,

        lr.description,

        lr.status,

        lr.created_at as "createdAt",

        lr.listing_id as "listingId",

        reporter.full_name as "reporterName",

        reporter.email as "reporterEmail",

        reporter.id as "reporterId",

        l.title as "listingTitle",

        owner.full_name as "listingOwner",

        owner.id as "listingOwnerId"

        FROM listing_reports lr

        LEFT JOIN users reporter
        ON reporter.id = lr.reporter_id

        LEFT JOIN listings l
        ON l.id = lr.listing_id

        LEFT JOIN users owner
        ON owner.id = l.owner_id

        ORDER BY lr.created_at DESC
        `
    );

    return result.rows;
}

export async function updateReportStatus(params: {
  reportId: string;
  status: string;
}): Promise<void> {
  await pool.query(
    "UPDATE listing_reports SET status = $1 WHERE id = $2",
    [params.status, params.reportId]
  );
}