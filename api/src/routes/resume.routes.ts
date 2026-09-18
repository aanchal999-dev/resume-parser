import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import {
  uploadResumes,
  streamBatchProgress,
} from '../controllers/resume.controller';

const router = Router();

// Protect all resume routes with JWT authentication
router.use(authenticateToken);

// POST /api/resumes/upload (with upload.array('files', 20))
router.post('/upload', upload.array('files', 20), uploadResumes);

// GET /api/resumes/stream/:batchId (SSE real-time stream)
router.get('/stream/:batchId', streamBatchProgress);

export default router;
