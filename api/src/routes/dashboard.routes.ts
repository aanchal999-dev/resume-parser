import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { getDashboardData, getResumewithMatchScore } from '../controllers/dashboard.controller';

const router = Router();

// Protect all resume routes with JWT authentication
router.use(authenticateToken);

router.get('/matchedResumes/:jobRoleId/:minMatchScore', getResumewithMatchScore);

router.get('/dashboardData', getDashboardData)

export default router;
