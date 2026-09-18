import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { register, login, getProfile } from '../controllers/auth.controller';

const router = Router();

// Route: Recruiter Registration
// POST /api/auth/register
router.post('/register', register);

// Route: Recruiter Login
// POST /api/auth/login
router.post('/login', login);

// Route: Current Logged-In Recruiter Profile (Protected)
// GET /api/auth/me
router.get('/me', authenticateToken, getProfile);

export default router;
