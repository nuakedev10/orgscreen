import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Ensure uploads/ exists at boot (multer won't create it).
const UPLOAD_DIR = 'uploads/';
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['.pdf', '.csv', '.xlsx', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}. Allowed: ${allowedTypes.join(', ')}`));
  }
};

// Generic uploader for small single files (CSVs, single PDF metadata uploads).
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max per file
});

// Dedicated uploader for bulk resume uploads — higher per-file cap, up to 25 files.
export const resumeUpload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error(`Only PDF resumes are allowed. Rejected: ${file.originalname}`));
    }
  },
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB per resume
    files: 25,
  }
});
