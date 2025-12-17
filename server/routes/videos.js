import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import fsSync from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// GET /api/videos/:id - Get video metadata
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const metadataPath = path.join(__dirname, '../../video_inputs', `${id}_metadata.json`);

    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(metadataContent);

    res.json({
      success: true,
      video: {
        ...metadata,
        url: `http://localhost:3001/api/videos/${id}/stream`
      }
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    next(error);
  }
});

// GET /api/videos/:id/stream - Stream video with range support
router.get('/:id/stream', async (req, res, next) => {
  try {
    const { id } = req.params;
    const videoInputDir = path.join(__dirname, '../../video_inputs');

    // Find the video file (could be .mp4, .mov, or .avi)
    const files = await fs.readdir(videoInputDir);
    const videoFile = files.find(f => f.startsWith(id) && !f.endsWith('_metadata.json'));

    if (!videoFile) {
      return res.status(404).json({
        success: false,
        error: 'Video file not found'
      });
    }

    const videoPath = path.join(videoInputDir, videoFile);
    const stat = await fs.stat(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fsSync.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      // No range requested, send entire file
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fsSync.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    next(error);
  }
});

// DELETE /api/videos/:id - Delete a video
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const videoInputDir = path.join(__dirname, '../../video_inputs');

    // Find and delete video file and metadata
    const files = await fs.readdir(videoInputDir);
    const relatedFiles = files.filter(f => f.startsWith(id));

    for (const file of relatedFiles) {
      await fs.unlink(path.join(videoInputDir, file));
    }

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
