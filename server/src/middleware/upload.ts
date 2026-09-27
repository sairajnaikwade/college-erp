import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ApiError } from '../utils/api-error';

// Dedicated server directory for uploaded study materials
export const NOTES_UPLOAD_DIR = path.resolve(__dirname, '../../uploads/notes');

// Automatically ensure directory exists
if (!fs.existsSync(NOTES_UPLOAD_DIR)) {
  fs.mkdirSync(NOTES_UPLOAD_DIR, { recursive: true });
}

// 10 MB maximum file size limit
export const MAX_NOTE_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Disk storage with safe unique temporary UUID filenames
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(NOTES_UPLOAD_DIR)) {
      fs.mkdirSync(NOTES_UPLOAD_DIR, { recursive: true });
    }
    cb(null, NOTES_UPLOAD_DIR);
  },
  filename: (_req, _file, cb) => {
    const tempName = `temp_${uuidv4()}.tmp`;
    cb(null, tempName);
  },
});

// File filter: strict PDF validation
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isPdfMime = file.mimetype === 'application/pdf' || file.mimetype === 'application/x-pdf';
  const isPdfExt = ext === '.pdf';

  if (!isPdfMime || !isPdfExt) {
    return cb(
      new ApiError(400, 'Please select a PDF file. Only PDF documents (.pdf) are permitted.')
    );
  }

  cb(null, true);
};

const rawMulterUpload = multer({
  storage,
  limits: {
    fileSize: MAX_NOTE_FILE_SIZE,
    files: 1,
  },
  fileFilter,
}).single('file');

/**
 * Validates magic numbers of the uploaded file to ensure it's genuinely a PDF.
 */
export async function validatePdfMagicBytes(filePath: string): Promise<boolean> {
  try {
    const buffer = Buffer.alloc(4);
    const fd = await fs.promises.open(filePath, 'r');
    await fd.read(buffer, 0, 4, 0);
    await fd.close();
    // %PDF in ASCII is [0x25, 0x50, 0x44, 0x46]
    return (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    );
  } catch {
    return false;
  }
}

/**
 * Express middleware wrapper for note PDF upload handling.
 * Gracefully formats MulterErrors into standard API responses.
 */
export function noteUploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  rawMulterUpload(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ApiError(400, 'PDF file size must not exceed 10 MB.'));
        }
        return next(new ApiError(400, `File upload error: ${err.message}`));
      }
      return next(err);
    }

    // If a file was uploaded, perform magic bytes check
    if (req.file) {
      const isValidPdf = await validatePdfMagicBytes(req.file.path);
      if (!isValidPdf) {
        // Clean up invalid temp file
        try {
          if (fs.existsSync(req.file.path)) {
            await fs.promises.unlink(req.file.path);
          }
        } catch {
          // ignore cleanup errors
        }
        return next(
          new ApiError(400, 'Invalid PDF file format. The uploaded file is not a valid PDF document.')
        );
      }
    }

    next();
  });
}
