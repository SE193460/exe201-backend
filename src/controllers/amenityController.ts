import { Request, Response } from "express";
import { createAmenity, deleteAmenityById, findAmenityByName, listAmenities, updateAmenity } from "../repositories/amenityRepository";

export async function listPublicAmenities(req: Request, res: Response) {
  const amenities = await listAmenities();
  return res.json(amenities.map((amenity) => ({ id: amenity.id, name: amenity.name })));
}

export async function listAdminAmenities(req: Request, res: Response) {
  const amenities = await listAmenities();
  return res.json(
    amenities.map((amenity) => ({
      id: amenity.id,
      name: amenity.name,
      createdAt: amenity.created_at,
      updatedAt: amenity.updated_at,
    }))
  );
}

export async function createAdminAmenity(req: Request, res: Response) {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name) {
    return res.status(400).json({ message: "Missing amenity name" });
  }

  const existing = await findAmenityByName(name);
  if (existing) {
    return res.status(409).json({ message: "Amenity already exists" });
  }

  const amenity = await createAmenity(name);
  return res.status(201).json({ id: amenity.id, name: amenity.name, createdAt: amenity.created_at, updatedAt: amenity.updated_at });
}

export async function updateAdminAmenity(req: Request, res: Response) {
  const rawId = req.params.id;
  const amenityId = Array.isArray(rawId) ? rawId[0] : rawId;
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name) {
    return res.status(400).json({ message: "Missing amenity name" });
  }

  const existing = await findAmenityByName(name);
  if (existing && existing.id !== amenityId) {
    return res.status(409).json({ message: "Amenity already exists" });
  }

  const updated = await updateAmenity(amenityId, name);
  if (!updated) {
    return res.status(404).json({ message: "Amenity not found" });
  }

  return res.json({ id: updated.id, name: updated.name, createdAt: updated.created_at, updatedAt: updated.updated_at });
}

export async function deleteAdminAmenity(req: Request, res: Response) {
  const rawId = req.params.id;
  const amenityId = Array.isArray(rawId) ? rawId[0] : rawId;

  const result = await deleteAmenityById(amenityId);
  if (result.inUse) {
    return res.status(409).json({ message: "Amenity is already used in listings" });
  }
  if (!result.deleted) {
    return res.status(404).json({ message: "Amenity not found" });
  }

  return res.json({ message: "Amenity deleted" });
}

