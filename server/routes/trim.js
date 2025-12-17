import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { runPythonScript } from '../services/pythonRunner.js';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { videoId, startTime, endTime, outputName } = req.body;

    if (!videoId || startTime === undefined || endTime === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: videoId, startTime, endTime'
      });
    }

    // Find the input video file
    const videoInputDir = path.join(__dirname, '../../video_inputs');
    const files = await fs.readdir(videoInputDir);
    const videoFile = files.find(f => f.startsWith(videoId) && !f.endsWith('_metadata.json'));

    if (!videoFile) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    const inputPath = path.join(videoInputDir, videoFile);
    const ext = path.extname(videoFile);

    // Generate output filename
    const outputId = uuidv4();
    const safeOutputName = (outputName || 'trimmed').replace(/[^a-z0-9_-]/gi, '_');
    const outputFilename = `${outputId}_${safeOutputName}${ext}`;
    const outputPath = path.join(__dirname, '../../video_outputs', outputFilename);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Run video trimmer
    await runPythonScript('video_trimmer.py', [
      '--input', inputPath,
      '--output', outputPath,
      '--start', startTime.toString(),
      '--end', endTime.toString()
    ]);

    // Get output file stats
    const stats = await fs.stat(outputPath);

    res.json({
      success: true,
      outputVideo: {
        id: outputId,
        filename: outputFilename,
        path: `/outputs/${outputFilename}`,
        downloadUrl: `/outputs/${outputFilename}`,
        size: stats.size,
        trimmedFrom: {
          videoId,
          startTime,
          endTime
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
