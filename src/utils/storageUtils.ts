import { StringifyOptions } from "node:querystring";
import cloudinary from './cloudinary.ts';

// Function to calculate storage usage for a user's images in Cloudinary
export const getUserImageStorage = async (userId: string): Promise<{ totalBytes: number; total100MB: string,percentageOf100MB:string }> => {
  try {
    // Fetch resources from the user's folder in Cloudinary
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: `${userId}/`, // Folder structure: users/{userId}
      max_results: 500, // Adjust as needed
    });

    // Calculate total storage usage in bytes
    const totalBytes = result.resources.reduce((acc, resource) => {
      return acc + (resource.bytes || 0); // `bytes` is the size of the file in bytes
    }, 0);

    // Convert bytes to GB
    const total100MB = (totalBytes / (100 * 1024 * 1024)).toFixed(2);
    const percentageOf100MB = ((totalBytes / (100 * 1024 * 1024)) * 100).toFixed(2);

    // Return the storage usage
    return {
      totalBytes,
      total100MB,
      percentageOf100MB,
    };
  } catch (error) {
    console.error('Error fetching storage usage:', error);
    throw new Error('Failed to calculate storage usage');
  }
};