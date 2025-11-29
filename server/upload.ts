import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import crypto from 'crypto';

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'server', 'uploads');
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

// Configure storage - use memory storage for serverless compatibility
const storage = multer.memoryStorage();

// File filter - images and PDFs
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, GIF images and PDF documents are allowed.'));
  }
};

// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 5 // Max 5 files per upload
  }
});

// Helper to delete file
export async function deleteUploadedFile(filename: string): Promise<void> {
  // Basic validation: filename should not contain path separators
  if (!isValidFilename(filename)) {
    throw new Error('Invalid filename');
  }

  const filePath = path.resolve(uploadDir, filename);

  // Ensure resolved path is inside uploadDir to prevent path traversal
  if (!filePath.startsWith(path.resolve(uploadDir) + path.sep) && filePath !== path.resolve(uploadDir, filename)) {
    throw new Error('Invalid filename path');
  }

  try {
    // Check that the file exists before attempting to unlink
    await fs.access(filePath);
    await fs.unlink(filePath);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      const e: any = new Error('File not found');
      e.code = 'ENOENT';
      throw e;
    }
    console.error('Error deleting file:', error);
    throw error;
  }
}

// Helper to get file URL
export function getFileUrl(filename: string, req: any): string {
  const protocol = req.protocol;
  const host = req.get('host');
  // encode filename for URLs
  return `${protocol}://${host}/uploads/${encodeURIComponent(filename)}`;
}

// Validate filename contains only safe characters (no path separators)
export function isValidFilename(filename: string) {
  // Allow letters, numbers, dots, hyphens and underscores
  return /^[A-Za-z0-9._-]+$/.test(filename);
}
