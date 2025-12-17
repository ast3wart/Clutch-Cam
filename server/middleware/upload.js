import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../video_inputs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const videoId = uuidv4();
    const ext = path.extname(file.originalname);
    req.videoId = videoId; // Store for use in route handler
    req.originalFilename = file.originalname;
    cb(null, `${videoId}${ext}`);
  }
});

// File filter - only allow video files
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi'];
  const allowedExts = ['.mp4', '.mov', '.avi'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only MP4, MOV, and AVI files are allowed.'));
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024 // 2GB max file size
  }
});

export default upload;
