import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { env } from "../config/env";

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
});

/**
 * Uploads a local file to Cloudinary and returns the secure URL.
 * Automatically deletes the local file after upload.
 */
export async function uploadImage(filePath: string, folder = "listings"): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "image",
    });
    
    // Clean up local file asynchronously
    fs.unlink(filePath, (err) => {
      if (err) console.error(`Failed to delete local temp file ${filePath}:`, err);
    });

    return result.secure_url;
  } catch (error) {
    // Make sure we delete local file even on failure
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) console.error(`Failed to delete local temp file ${filePath}:`, err);
      });
    }
    console.error("Cloudinary upload error:", error);
    throw new Error("Failed to upload image to Cloudinary");
  }
}
