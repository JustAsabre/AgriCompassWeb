import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

// Configure Cloudinary.
// It automatically reads CLOUDINARY_URL from environment variables.
// IMPORTANT: Don't warn at import-time (tests import this module even when uploads aren't used).
// We validate configuration lazily in the upload/delete functions.

cloudinary.config({
  secure: true,
});

function ensureCloudinaryConfigured() {
  if (!process.env.CLOUDINARY_URL) {
    throw new Error('Cloudinary is not configured (missing CLOUDINARY_URL)');
  }
}

export const uploadToCloudinary = (buffer: Buffer, folder: string = 'agricompass'): Promise<{ url: string; public_id: string }> => {
  return new Promise((resolve, reject) => {
    try {
      ensureCloudinaryConfigured();
    } catch (err) {
      return reject(err);
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("Cloudinary upload failed - no result returned"));
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    ensureCloudinaryConfigured();
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Failed to delete image from Cloudinary:", error);
    throw error;
  }
};

export default cloudinary;
