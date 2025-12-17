import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { runPythonScript } from '../services/pythonRunner.js';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

const jobs = new Map();

router.post('/:videoId', async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const jobId = uuidv4();

    // Find the video file
    const videoInputDir = path.join(__dirname, '../../video_inputs');
    const files = await fs.readdir(videoInputDir);
    const videoFile = files.find(f => f.startsWith(videoId) && !f.endsWith('_metadata.json'));

    if (!videoFile) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    const videoPath = path.join(videoInputDir, videoFile);

    // Create job
    jobs.set(jobId, {
      status: 'processing',
      videoId,
      startedAt: new Date().toISOString(),
      progress: 0
    });

    // Start analysis in background
    (async () => {
      try {
        jobs.set(jobId, { ...jobs.get(jobId), progress: 30 });

        // Run unified analyzer
        const result = await runPythonScript('unified_analyzer.py', [
          '--video', videoPath,
          '--output', 'json'
        ]);

        // Update metadata with analysis results
        const metadataPath = path.join(videoInputDir, `${videoId}_metadata.json`);
        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
        metadata.highlights = result.highlights || [];
        metadata.status = 'analyzed';
        metadata.analyzedAt = new Date().toISOString();
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

        // Update job status
        jobs.set(jobId, {
          status: 'complete',
          videoId,
          highlights: result.highlights || [],
          completedAt: new Date().toISOString(),
          progress: 100
        });
      } catch (error) {
        console.error('Analysis error:', error);
        jobs.set(jobId, {
          status: 'failed',
          videoId,
          error: error.message,
          failedAt: new Date().toISOString()
        });
      }
    })();

    res.json({
      success: true,
      jobId,
      status: 'processing'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analyze/status/:jobId - Check analysis status
router.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found'
    });
  }

  res.json({
    success: true,
    ...job
  });
});

export default router;
