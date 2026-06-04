import { Request, Response } from "express";
import { listUsers, findUserWithRoleById, toggleUserActive } from "../repositories/userRepository";
import { listAllListingsForAdmin, updateListingStatusByAdmin } from "../repositories/listingRepository";

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

export async function approveListing(req: Request, res: Response) {
  const rawId = req.params.id;
  const listingId = Array.isArray(rawId) ? rawId[0] : rawId;
  const updated = await updateListingStatusByAdmin(listingId, "APPROVED", null);
  if (!updated) {
    return res.status(404).json({ message: "Listing not found" });
  }
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
  return res.json({ id: updated.id, status: updated.status, rejectionReason: updated.rejection_reason });
}
