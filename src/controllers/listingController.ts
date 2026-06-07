import { Request, Response } from "express";
import {
  createListingDraft,
  addListingImages,
  updateListingByIdAndOwner,
  findListingByIdAndOwner,
  listListingsByOwner,
  ListingRecord,
  submitListingForApproval,
  expireApprovedImportedListings,
  listPublicApprovedListings,
  findPublicApprovedListingById,
  deleteListingImageById,
} from "../repositories/listingRepository";
import { addAmenitiesToListing, listAmenitiesByIds, setListingAmenities } from "../repositories/amenityRepository";

function serializeListing(listing: ListingRecord) {
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
    images: (listing.images || []).map((image) => ({
      id: image.id,
      imageUrl: image.image_url,
      displayOrder: image.display_order,
      createdAt: image.created_at,
    })),
    amenities: (listing.amenities || []).map((a) => ({ id: a.id, name: a.name })),
    ownerName: listing.owner_name || null,
    ownerPhone: listing.owner_phone || null,
    ownerAvatar: listing.owner_avatar || null,
    ownerEmail: listing.owner_email || null,
    source: listing.source || null,
  };
}

export async function createMyListingDraft(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const {
    title,
    description,
    rentPrice,
    city,
    district,
    ward,
    address,
    latitude,
    longitude,
    availableFrom,
    preferredGender,
    roomType,
    roomAreaSqm,
    maxOccupants,
    currentOccupants,
    smokingAllowed,
    petAllowed,
    expiresAt,
    amenityIds,
    source,
  } = req.body;

  const normalizedAmenityIds = Array.isArray(amenityIds)
    ? Array.from(new Set(amenityIds.filter((id) => typeof id === "string")))
    : [];

  if (!title || !description || typeof rentPrice !== "number" || !city || !district || !ward) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (normalizedAmenityIds.length > 0) {
    const existing = await listAmenitiesByIds(normalizedAmenityIds);
    if (existing.length !== normalizedAmenityIds.length) {
      return res.status(400).json({ message: "Invalid amenity selection" });
    }
  }

  const listing = await createListingDraft({
    ownerId: userId,
    title,
    description,
    rentPrice,
    city: typeof city === "string" ? city : null,
    district,
    ward: typeof ward === "string" ? ward : null,
    address: address ?? null,
    latitude: typeof latitude === "number" ? latitude : null,
    longitude: typeof longitude === "number" ? longitude : null,
    availableFrom: typeof availableFrom === "string" ? availableFrom : null,
    preferredGender: typeof preferredGender === "string" ? preferredGender : null,
    roomType: typeof roomType === "string" ? roomType : null,
    roomAreaSqm: typeof roomAreaSqm === "number" ? roomAreaSqm : null,
    maxOccupants: typeof maxOccupants === "number" ? maxOccupants : null,
    currentOccupants: typeof currentOccupants === "number" ? currentOccupants : 0,
    smokingAllowed: typeof smokingAllowed === "boolean" ? smokingAllowed : false,
    petAllowed: typeof petAllowed === "boolean" ? petAllowed : false,
    expiresAt: typeof expiresAt === "string" ? expiresAt : null,
    source: typeof source === "string" && source.trim() ? source.trim() : null,
  });

  if (normalizedAmenityIds.length > 0) {
    await addAmenitiesToListing(listing.id, normalizedAmenityIds);
  }

  return res.status(201).json(serializeListing(listing));
}

export async function listMyListings(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const listings = await listListingsByOwner(userId);
  return res.json(listings.map(serializeListing));
}

export async function getMyListingDetail(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const rawId = req.params.id;
  const listingId = Array.isArray(rawId) ? rawId[0] : rawId;
  const listing = await findListingByIdAndOwner(listingId, userId);
  if (!listing) {
    return res.status(404).json({ message: "Listing not found" });
  }

  return res.json(serializeListing(listing));
}

export async function uploadMyListingImages(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const rawId = req.params.id;
  const listingId = Array.isArray(rawId) ? rawId[0] : rawId;
  const listing = await findListingByIdAndOwner(listingId, userId);
  if (!listing) {
    return res.status(404).json({ message: "Listing not found" });
  }

  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    return res.status(400).json({ message: "Missing listing images" });
  }

  if (listing.images.length + files.length > 10) {
    return res.status(400).json({ message: "Listing image limit exceeded" });
  }

  const imageUrls = files.map((file) => `/uploads/listings/${file.filename}`);
  const images = await addListingImages(listingId, imageUrls, listing.images.length);

  return res.status(201).json({
    listingId,
    images: images.map((image) => ({
      id: image.id,
      imageUrl: image.image_url,
      displayOrder: image.display_order,
      createdAt: image.created_at,
    })),
  });
}

export async function updateMyListing(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const rawId = req.params.id;
  const listingId = Array.isArray(rawId) ? rawId[0] : rawId;
  const {
    title,
    description,
    rentPrice,
    city,
    district,
    ward,
    address,
    latitude,
    longitude,
    availableFrom,
    preferredGender,
    roomType,
    roomAreaSqm,
    maxOccupants,
    currentOccupants,
    smokingAllowed,
    petAllowed,
    amenityIds,
    source,
  } = req.body;

  const normalizedAmenityIds = Array.isArray(amenityIds)
    ? Array.from(new Set(amenityIds.filter((id: unknown) => typeof id === "string")))
    : [];

  if (!title || !description || typeof rentPrice !== "number" || !city || !district || !ward) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (normalizedAmenityIds.length > 0) {
    const existing = await listAmenitiesByIds(normalizedAmenityIds);
    if (existing.length !== normalizedAmenityIds.length) {
      return res.status(400).json({ message: "Invalid amenity selection" });
    }
  }

  const updated = await updateListingByIdAndOwner({
    listingId,
    ownerId: userId,
    title,
    description,
    rentPrice,
    city: typeof city === "string" ? city : null,
    district,
    ward: typeof ward === "string" ? ward : null,
    address: typeof address === "string" ? address : null,
    latitude: typeof latitude === "number" ? latitude : null,
    longitude: typeof longitude === "number" ? longitude : null,
    availableFrom: typeof availableFrom === "string" ? availableFrom : null,
    preferredGender: typeof preferredGender === "string" ? preferredGender : null,
    roomType: typeof roomType === "string" ? roomType : null,
    roomAreaSqm: typeof roomAreaSqm === "number" ? roomAreaSqm : null,
    maxOccupants: typeof maxOccupants === "number" ? maxOccupants : null,
    currentOccupants: typeof currentOccupants === "number" ? currentOccupants : 0,
    smokingAllowed: typeof smokingAllowed === "boolean" ? smokingAllowed : false,
    petAllowed: typeof petAllowed === "boolean" ? petAllowed : false,
    source: typeof source === "string" && source.trim() ? source.trim() : null,
  });

  if (!updated) {
    return res.status(404).json({ message: "Listing not found" });
  }

  await setListingAmenities(listingId, normalizedAmenityIds);

  const result = await findListingByIdAndOwner(listingId, userId);
  return res.json(serializeListing(result ?? updated));
}

export async function submitMyListing(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const rawId = req.params.id;
  const listingId = Array.isArray(rawId) ? rawId[0] : rawId;
  const submitted = await submitListingForApproval(listingId, userId);
  if (!submitted) {
    return res.status(404).json({ message: "Listing not found or cannot be submitted (must be in DRAFT or REJECTED status)" });
  }

  return res.json(serializeListing(submitted));
}

export async function getPublicListings(req: Request, res: Response) {
  await expireApprovedImportedListings(30);
  const listings = await listPublicApprovedListings();
  return res.json(listings.map(serializeListing));
}

export async function getPublicListingDetail(req: Request, res: Response) {
  await expireApprovedImportedListings(30);
  const rawId = req.params.id;
  const listingId = Array.isArray(rawId) ? rawId[0] : rawId;
  const listing = await findPublicApprovedListingById(listingId);
  if (!listing) {
    return res.status(404).json({ message: "Listing not found" });
  }
  return res.json(serializeListing(listing));
}

export async function deleteMyListingImage(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const rawListingId = req.params.id;
  const listingId = Array.isArray(rawListingId) ? rawListingId[0] : rawListingId;
  const rawImageId = req.params.imageId;
  const imageId = Array.isArray(rawImageId) ? rawImageId[0] : rawImageId;

  const listing = await findListingByIdAndOwner(listingId, userId);
  if (!listing) {
    return res.status(404).json({ message: "Listing not found" });
  }

  const deleted = await deleteListingImageById(imageId, listingId);
  if (!deleted) {
    return res.status(404).json({ message: "Image not found" });
  }

  return res.json({ message: "Image deleted successfully", imageId, listingId });
}

export async function addListingImageUrls(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const rawId = req.params.id;
  const listingId = Array.isArray(rawId) ? rawId[0] : rawId;
  const listing = await findListingByIdAndOwner(listingId, userId);
  if (!listing) return res.status(404).json({ message: "Listing not found" });

  const { urls } = req.body as { urls?: unknown };
  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ message: "Missing urls array" });
  }

  const validUrls = (urls as unknown[]).filter(
    (u): u is string => typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://"))
  );
  if (validUrls.length === 0) {
    return res.status(400).json({ message: "No valid URLs provided" });
  }
  if (listing.images.length + validUrls.length > 10) {
    return res.status(400).json({ message: "Listing image limit exceeded" });
  }

  const images = await addListingImages(listingId, validUrls, listing.images.length);
  return res.status(201).json({
    listingId,
    images: images.map((img) => ({
      id: img.id,
      imageUrl: img.image_url,
      displayOrder: img.display_order,
      createdAt: img.created_at,
    })),
  });
}

