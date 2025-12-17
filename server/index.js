import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import uploadRoutes from './routes/upload.js';
import videoRoutes from './routes/videos.js';
import analyzeRoutes from './routes/analyze.js';
import trimRoutes from './routes/trim.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.use('/outputs', express.static(path.join(__dirname, '../video_outputs')));

app.use('/api/upload', uploadRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/trim', trimRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`ClutchCam API server running on http://localhost:${PORT}`);
  console.log(`Video inputs: ${path.join(__dirname, '../video_inputs')}`);
  console.log(`Video outputs: ${path.join(__dirname, '../video_outputs')}`);
});
