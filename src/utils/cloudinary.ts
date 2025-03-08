// src/utils/cloudinary.js
import { v2 as cloudinary } from "npm:cloudinary";
import { logger } from "./logger.ts";

try {
  const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
  const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
  const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Missing Cloudinary credentials");
  }

  cloudinary.config({
    cloud_name: cloudName.trim(),
    api_key: apiKey.trim(),
    api_secret: apiSecret.trim()
  });

  logger.info("Cloudinary configured successfully");
} catch (error) {
  logger.error("Cloudinary configuration failed", {
    error: error instanceof Error ? error.message : "Unknown error"
  });
  throw error;
}

export default cloudinary;