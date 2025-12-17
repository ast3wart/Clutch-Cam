import express from 'express';
import upload from '../middleware/upload.js';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

router.post('/', upload.single('video'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file provided'
      });
    }

    const videoId = req.videoId;
    const videoPath = req.file.path;

    // Create metadata file
    const metadata = {
      id: videoId,
      filename: req.originalFilename,
      savedAs: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
      status: 'uploaded'
    };

    const metadataPath = path.join(path.dirname(videoPath), `${videoId}_metadata.json`);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    res.json({
      success: true,
      video: {
        id: videoId,
        filename: req.originalFilename,
        size: req.file.size,
        uploadedAt: metadata.uploadedAt,
        status: 'uploaded'
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
