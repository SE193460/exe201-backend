import { Request, Response } from "express";
import { pool } from "../config/db";
import { listUsers, findUserWithRoleById, toggleUserActive } from "../repositories/userRepository";
import {
  listAllListingsForAdmin,
  updateListingStatusByAdmin,
  listAdminImportedListings,
  findAdminImportedListingById,
  findListingBySource,
  createAdminImportedListing,
  updateAdminImportedListing,
  publishAdminImportedListing,
  unpublishAdminImportedListing,
  addListingImages,
  listAllReports,
  resolveReport,
} from "../repositories/listingRepository";
import { setListingAmenities, listAmenitiesByIds, addAmenitiesToListing } from "../repositories/amenityRepository";
import { createNotification } from "../repositories/notificationRepository";

export async function getUsers(req: Request, res: Response) {
  const query = typeof req.query.q === "string" ? req.query.q : "";
  const status = typeof req.query.status === "string" ? req.query.status : "all";
  const users = await listUsers({
    query: query || undefined,
    status: status === "active" || status === "inactive" ? status : "all",
  });

  return res.json(
    users.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      username: user.username,
      roleName: user.role_name || "user",
      isEmailVerified: user.is_email_verified,
      isActive: user.is_active,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
    }))
  );
}

export async function getUserDetail(req: Request, res: Response) {
  const rawId = req.params.id;
  const userId = Array.isArray(rawId) ? rawId[0] : rawId;
  const user = await findUserWithRoleById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    username: user.username,
    roleName: user.role_name || "user",
    isEmailVerified: user.is_email_verified,
    isActive: user.is_active,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
  });
}

export async function updateUserStatus(req: Request, res: Response) {
  const rawId = req.params.id;
  const userId = Array.isArray(rawId) ? rawId[0] : rawId;
  const { isActive } = req.body as { isActive?: boolean };
  if (typeof isActive !== "boolean") {
    return res.status(400).json({ message: "Missing isActive" });
  }

  const updated = await toggleUserActive(userId, isActive);
  if (!updated) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({
    id: updated.id,
    isActive: updated.is_active,
  });
}

export async function getAdminListings(req: Request, res: Response) {
  const listings = await listAllListingsForAdmin();
  return res.json(
    listings.map((listing) => ({
      id: listing.id,
      ownerId: listing.owner_id,
      title: listing.title,
      description: listing.description,
      rentPrice: listing.rent_price,
      city: listing.city,
      district: listing.district,
      ward: listing.ward,
      address: listing.address,
      latitude: listing.latitude,
      longitude: listing.longitude,
      availableFrom: listing.available_from,
      preferredGender: listing.preferred_gender,
      roomType: listing.room_type,
      roomAreaSqm: listing.room_area_sqm,
      maxOccupants: listing.max_occupants,
      currentOccupants: listing.current_occupants,
      smokingAllowed: listing.smoking_allowed,
      petAllowed: listing.pet_allowed,
      status: listing.status,
      rejectionReason: listing.rejection_reason,
      publishedAt: listing.published_at,
      expiresAt: listing.expires_at,
      createdAt: listing.created_at,
      updatedAt: listing.updated_at,
      images: (listing.images || []).map((img) => ({
        id: img.id,
        imageUrl: img.image_url,
        displayOrder: img.display_order,
      })),
      amenities: (listing.amenities || []).map((a) => ({ id: a.id, name: a.name })),
      ownerName: listing.owner_name,
      ownerEmail: listing.owner_email,
      ownerPhone: listing.owner_phone,
      ownerAvatar: listing.owner_avatar,
    }))
  );
}

export async function getAdminDashboard(req: Request, res: Response) {
  try {
    const [userStatsRes, listingStatsRes, reportStatsRes, paymentStatsRes, userGrowthWeeklyRes, revenueTrendWeeklyRes, userGrowthYearlyRes, revenueTrendYearlyRes, topImportSourcesRes, recentPaymentsRes, recentReportsRes] =
      await Promise.all([
        pool.query(
          `SELECT
            COUNT(*)::int AS total_users,
            COUNT(*) FILTER (WHERE is_active) AS active_users,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS new_users_last_7d,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days') AS new_users_prev_7d
          FROM users`
        ),
        pool.query(
          `SELECT
            COUNT(*) FILTER (WHERE (source IS NULL OR TRIM(source) = '') AND status = 'APPROVED' AND published_at IS NOT NULL)::int AS total_listings,
            COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending_listings,
            COUNT(*) FILTER (WHERE status = 'REJECTED')::int AS rejected_listings,
            COUNT(*) FILTER (WHERE status = 'APPROVED')::int AS approved_listings,
            COUNT(*) FILTER (WHERE (source IS NOT NULL AND TRIM(source) != '') AND status = 'APPROVED' AND published_at IS NOT NULL)::int AS imported_listings,
            COUNT(DISTINCT source) FILTER (WHERE source IS NOT NULL AND TRIM(source) != '')::int AS imported_source_count
          FROM listings`
        ),
        pool.query(
          `SELECT
            COUNT(*)::int AS total_reports,
            COUNT(*) FILTER (WHERE status != 'RESOLVED')::int AS unresolved_reports,
            COUNT(*) FILTER (WHERE status = 'RESOLVED')::int AS resolved_reports
          FROM listing_reports`
        ),
        pool.query(
          `SELECT
            COALESCE(SUM(amount) FILTER (WHERE status = 'COMPLETED'), 0)::int AS total_revenue,
            COALESCE(SUM(amount) FILTER (WHERE status = 'PENDING'), 0)::int AS pending_revenue,
            COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed_transactions,
            COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending_transactions,
            COALESCE(SUM(amount) FILTER (WHERE status = 'COMPLETED' AND created_at >= NOW() - INTERVAL '30 days'), 0)::int AS revenue_last_30d,
            COALESCE(SUM(amount) FILTER (WHERE status = 'COMPLETED' AND created_at >= NOW() - INTERVAL '7 days'), 0)::int AS revenue_last_7d,
            COALESCE(SUM(amount) FILTER (WHERE status = 'COMPLETED' AND created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days'), 0)::int AS revenue_prev_7d
          FROM payment_transactions`
        ),
        pool.query(
          `SELECT
            EXTRACT(DAY FROM day)::text AS day,
            COALESCE(COUNT(u.*), 0)::int AS new_users
          FROM generate_series(
            date_trunc('month', NOW()),
            date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day',
            INTERVAL '1 day'
          ) AS day
          LEFT JOIN users u ON date_trunc('day', u.created_at) = day
          GROUP BY EXTRACT(DAY FROM day)
          ORDER BY EXTRACT(DAY FROM day)`
        ),
        pool.query(
          `SELECT
            EXTRACT(DAY FROM day)::text AS day,
            COALESCE(SUM(pt.amount) FILTER (WHERE pt.status = 'COMPLETED'), 0)::int AS revenue
          FROM generate_series(
            date_trunc('month', NOW()),
            date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day',
            INTERVAL '1 day'
          ) AS day
          LEFT JOIN payment_transactions pt ON date_trunc('day', pt.created_at) = day
          GROUP BY EXTRACT(DAY FROM day)
          ORDER BY EXTRACT(DAY FROM day)`
        ),
        pool.query(
          `SELECT
            TO_CHAR(month, 'MM') AS month,
            COALESCE(COUNT(u.*), 0)::int AS new_users
          FROM generate_series(
            date_trunc('year', NOW()),
            date_trunc('year', NOW()) + INTERVAL '1 year' - INTERVAL '1 day',
            INTERVAL '1 month'
          ) AS month
          LEFT JOIN users u ON date_trunc('month', u.created_at) = month AND EXTRACT(YEAR FROM u.created_at) = EXTRACT(YEAR FROM NOW())
          GROUP BY month
          ORDER BY month`
        ),
        pool.query(
          `SELECT
            TO_CHAR(month, 'MM') AS month,
            COALESCE(SUM(pt.amount) FILTER (WHERE pt.status = 'COMPLETED'), 0)::int AS revenue
          FROM generate_series(
            date_trunc('year', NOW()),
            date_trunc('year', NOW()) + INTERVAL '1 year' - INTERVAL '1 day',
            INTERVAL '1 month'
          ) AS month
          LEFT JOIN payment_transactions pt ON date_trunc('month', pt.created_at) = month AND EXTRACT(YEAR FROM pt.created_at) = EXTRACT(YEAR FROM NOW())
          GROUP BY month
          ORDER BY month`
        ),
        pool.query(
          `SELECT source, COUNT(*)::int AS count
          FROM listings
          WHERE source IS NOT NULL AND TRIM(source) != ''
          GROUP BY source
          ORDER BY count DESC
          LIMIT 5`
        ),
        pool.query(
          `SELECT
            pt.id,
            pt.code,
            pt.amount,
            pt.package_name AS package_name,
            pt.status,
            pt.created_at,
            pt.listing_id AS listing_id,
            l.title AS listing_title,
            u.full_name AS user_name,
            u.email AS user_email
          FROM payment_transactions pt
          LEFT JOIN listings l ON l.id = pt.listing_id
          LEFT JOIN users u ON u.id = pt.user_id
          WHERE pt.status IN ('PENDING', 'COMPLETED')
          ORDER BY pt.created_at DESC
          LIMIT 5`
        ),
        pool.query(
          `SELECT
            lr.id,
            lr.status,
            lr.reason,
            lr.description,
            lr.created_at,
            lr.listing_id,
            l.title AS listing_title,
            u.full_name AS reporter_name,
            u.email AS reporter_email
          FROM listing_reports lr
          LEFT JOIN listings l ON l.id = lr.listing_id
          LEFT JOIN users u ON u.id = lr.reporter_id
          ORDER BY lr.created_at DESC
          LIMIT 5`
        ),
      ]);

    const userStats = userStatsRes.rows[0];
    const listingStats = listingStatsRes.rows[0];
    const reportStats = reportStatsRes.rows[0];
    const paymentStats = paymentStatsRes.rows[0];
    const userGrowthWeekly = userGrowthWeeklyRes.rows;
    const revenueTrendWeekly = revenueTrendWeeklyRes.rows;
    const userGrowthYearly = userGrowthYearlyRes.rows;
    const revenueTrendYearly = revenueTrendYearlyRes.rows;

    return res.json({
      userStats,
      listingStats,
      reportStats,
      paymentStats,
      userGrowthWeekly,
      revenueTrendWeekly,
      userGrowthYearly,
      revenueTrendYearly,
      topImportSources: topImportSourcesRes.rows,
      recentPayments: recentPaymentsRes.rows,
      recentReports: recentReportsRes.rows,
    });
  } catch (error) {
    console.error("Fetch admin dashboard error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function approveListing(req: Request, res: Response) {
  const rawId = req.params.id;
  const listingId = Array.isArray(rawId) ? rawId[0] : rawId;
  const updated = await updateListingStatusByAdmin(listingId, "APPROVED", null);
  if (!updated) {
    return res.status(404).json({ message: "Listing not found" });
  }
  // Notify the owner
  await createNotification({
    userId: updated.owner_id,
    type: "listing_approved",
    title: "Bài đăng đã được duyệt",
    message: `Bài đăng "${updated.title}" của bạn đã được duyệt và hiển thị công khai.`,
    listingId: updated.id,
  });
  return res.json({ id: updated.id, status: updated.status });
}

export async function rejectListing(req: Request, res: Response) {
  const rawId = req.params.id;
  const listingId = Array.isArray(rawId) ? rawId[0] : rawId;
  const { rejectionReason } = req.body as { rejectionReason?: string };
  if (!rejectionReason) {
    return res.status(400).json({ message: "Missing rejectionReason" });
  }

  const updated = await updateListingStatusByAdmin(listingId, "REJECTED", rejectionReason);
  if (!updated) {
    return res.status(404).json({ message: "Listing not found" });
  }
  // Notify the owner
  await createNotification({
    userId: updated.owner_id,
    type: "listing_rejected",
    title: "Bài đăng bị từ chối",
    message: `Bài đăng "${updated.title}" của bạn bị từ chối vì: ${rejectionReason}`,
    listingId: updated.id,
  });
  return res.json({ id: updated.id, status: updated.status, rejectionReason: updated.rejection_reason });
}

// --- Admin Imported Listings ---

function serializeImported(listing: Awaited<ReturnType<typeof findAdminImportedListingById>>) {
  if (!listing) return null;
  return {
    id: listing.id,
    ownerId: listing.owner_id,
    title: listing.title,
    description: listing.description,
    rentPrice: listing.rent_price,
    city: listing.city,
    district: listing.district,
    ward: listing.ward,
    address: listing.address,
    availableFrom: listing.available_from,
    preferredGender: listing.preferred_gender,
    roomType: listing.room_type,
    roomAreaSqm: listing.room_area_sqm,
    maxOccupants: listing.max_occupants,
    currentOccupants: listing.current_occupants,
    smokingAllowed: listing.smoking_allowed,
    petAllowed: listing.pet_allowed,
    status: listing.status,
    rejectionReason: listing.rejection_reason,
    publishedAt: listing.published_at,
    expiresAt: listing.expires_at,
    createdAt: listing.created_at,
    updatedAt: listing.updated_at,
    source: listing.source || null,
    images: (listing.images || []).map((img) => ({
      id: img.id,
      imageUrl: img.image_url,
      displayOrder: img.display_order,
    })),
    amenities: (listing.amenities || []).map((a) => ({ id: a.id, name: a.name })),
  };
}

export async function getAdminImportedListings(req: Request, res: Response) {
  const listings = await listAdminImportedListings();
  return res.json(listings.map(serializeImported));
}

export async function getAdminImportedListingById(req: Request, res: Response) {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const listing = await findAdminImportedListingById(id);
  if (!listing) return res.status(404).json({ message: "Imported listing not found" });
  return res.json(serializeImported(listing));
}

export async function createAdminImportedListingHandler(req: Request, res: Response) {
  const adminId = req.user?.id;
  if (!adminId) return res.status(401).json({ message: "Unauthorized" });

  const {
    title, description, rentPrice, city, district, ward, address,
    availableFrom, preferredGender, roomType, roomAreaSqm,
    maxOccupants, currentOccupants, smokingAllowed, petAllowed,
    source, amenityIds, imageUrls,
  } = req.body as Record<string, unknown>;

  if (!title || !description || typeof rentPrice !== "number" || !district || !source) {
    return res.status(400).json({ message: "Missing required fields (title, description, rentPrice, district, source)" });
  }

  const duplicateSource = await findListingBySource(String(source));
  if (duplicateSource) {
    return res.status(409).json({ message: "Link bài đăng gốc đã tồn tại trong hệ thống" });
  }

  const normalizedAmenityIds = Array.isArray(amenityIds)
    ? Array.from(new Set((amenityIds as unknown[]).filter((id): id is string => typeof id === "string")))
    : [];

  let listing;
  try {
    listing = await createAdminImportedListing({
      ownerId: adminId,
      title: title as string,
      description: description as string,
      rentPrice: rentPrice as number,
      city: typeof city === "string" ? city : null,
      district: district as string,
      ward: typeof ward === "string" ? ward : null,
      address: typeof address === "string" ? address : null,
      availableFrom: typeof availableFrom === "string" ? availableFrom : null,
      preferredGender: typeof preferredGender === "string" ? preferredGender : null,
      roomType: typeof roomType === "string" ? roomType : null,
      roomAreaSqm: typeof roomAreaSqm === "number" ? roomAreaSqm : null,
      maxOccupants: typeof maxOccupants === "number" ? maxOccupants : null,
      currentOccupants: typeof currentOccupants === "number" ? currentOccupants : 0,
      smokingAllowed: typeof smokingAllowed === "boolean" ? smokingAllowed : false,
      petAllowed: typeof petAllowed === "boolean" ? petAllowed : false,
      source: source as string,
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return res.status(409).json({ message: "Link bài đăng gốc đã tồn tại trong hệ thống" });
    }
    throw error;
  }

  if (normalizedAmenityIds.length > 0) {
    await addAmenitiesToListing(listing.id, normalizedAmenityIds);
  }

  // Add external image URLs if provided
  if (Array.isArray(imageUrls)) {
    const validUrls = (imageUrls as unknown[]).filter(
      (u): u is string => typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://"))
    );
    if (validUrls.length > 20) {
      return res.status(400).json({ message: "Image limit exceeded" });
    }
    if (validUrls.length > 0) {
      await addListingImages(listing.id, validUrls, 0);
    }
  }

  const full = await findAdminImportedListingById(listing.id);
  return res.status(201).json(serializeImported(full));
}

export async function updateAdminImportedListingHandler(req: Request, res: Response) {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const {
    title, description, rentPrice, city, district, ward, address,
    availableFrom, preferredGender, roomType, roomAreaSqm,
    maxOccupants, currentOccupants, smokingAllowed, petAllowed,
    source, amenityIds,
  } = req.body as Record<string, unknown>;

  if (!title || !description || typeof rentPrice !== "number" || !district || !source) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const duplicateSource = await findListingBySource(String(source), id);
  if (duplicateSource) {
    return res.status(409).json({ message: "Link bài đăng gốc đã tồn tại trong hệ thống" });
  }

  let updated;
  try {
    updated = await updateAdminImportedListing({
      listingId: id,
      title: title as string,
      description: description as string,
      rentPrice: rentPrice as number,
      city: typeof city === "string" ? city : null,
      district: district as string,
      ward: typeof ward === "string" ? ward : null,
      address: typeof address === "string" ? address : null,
      availableFrom: typeof availableFrom === "string" ? availableFrom : null,
      preferredGender: typeof preferredGender === "string" ? preferredGender : null,
      roomType: typeof roomType === "string" ? roomType : null,
      roomAreaSqm: typeof roomAreaSqm === "number" ? roomAreaSqm : null,
      maxOccupants: typeof maxOccupants === "number" ? maxOccupants : null,
      currentOccupants: typeof currentOccupants === "number" ? currentOccupants : 0,
      smokingAllowed: typeof smokingAllowed === "boolean" ? smokingAllowed : false,
      petAllowed: typeof petAllowed === "boolean" ? petAllowed : false,
      source: source as string,
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return res.status(409).json({ message: "Link bài đăng gốc đã tồn tại trong hệ thống" });
    }
    throw error;
  }

  if (!updated) return res.status(404).json({ message: "Imported listing not found" });

  const normalizedAmenityIds = Array.isArray(amenityIds)
    ? Array.from(new Set((amenityIds as unknown[]).filter((id): id is string => typeof id === "string")))
    : [];
  await setListingAmenities(id, normalizedAmenityIds);

  const full = await findAdminImportedListingById(id);
  return res.json(serializeImported(full));
}

export async function publishAdminImportedListingHandler(req: Request, res: Response) {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await publishAdminImportedListing(id);
  if (!result) return res.status(404).json({ message: "Listing not found or already published" });
  return res.json(serializeImported(result));
}

export async function unpublishAdminImportedListingHandler(req: Request, res: Response) {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await unpublishAdminImportedListing(id);
  if (!result) return res.status(404).json({ message: "Listing not found or not published" });
  return res.json(serializeImported(result));
}

export async function addAdminImportedListingImageUrls(req: Request, res: Response) {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const listing = await findAdminImportedListingById(id);
  if (!listing) return res.status(404).json({ message: "Listing not found" });

  const { urls } = req.body as { urls?: unknown };
  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ message: "Missing urls" });
  }
  const validUrls = (urls as unknown[]).filter(
    (u): u is string => typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://"))
  );
  if (validUrls.length === 0) return res.status(400).json({ message: "No valid URLs" });
  if (listing.images.length + validUrls.length > 20) {
    return res.status(400).json({ message: "Image limit exceeded" });
  }
  const images = await addListingImages(id, validUrls, listing.images.length);
  return res.status(201).json({
    listingId: id,
    images: images.map((img) => ({ id: img.id, imageUrl: img.image_url, displayOrder: img.display_order })),
  });
}

export async function getReports(req: Request, res: Response) {
  try {
    const reports = await listAllReports();
    return res.json(
      reports.map((report) => ({
        id: report.id,
        reporterId: report.reporter_id,
        listingId: report.listing_id,
        reason: report.reason,
        description: report.description,
        status: report.status,
        createdAt: report.created_at,
        listingTitle: report.listing_title,
        reporterName: report.reporter_name,
        reporterEmail: report.reporter_email,
      }))
    );
  } catch (error) {
    console.error("Fetch listing reports error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function resolveReportHandler(req: Request, res: Response) {
  const rawId = req.params.id;
  const reportId = Array.isArray(rawId) ? rawId[0] : rawId;
  try {
    const resolved = await resolveReport(reportId);
    if (!resolved) {
      return res.status(404).json({ message: "Report not found" });
    }
    return res.json({ message: "Phản ánh đã được đánh dấu giải quyết" });
  } catch (error) {
    console.error("Resolve report error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

