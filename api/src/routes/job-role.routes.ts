import { Router } from 'express';
import {
  createJobRole,
  getAllJobRoles,
  deleteJobRole,
} from '../controllers/job-role.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Protect all job role endpoints with JWT authentication
router.use(authenticateToken);

// POST /api/job-roles - Create Job Role
router.post('/', createJobRole);

// GET /api/job-roles - Get All Job Roles
router.get('/', getAllJobRoles);

// DELETE /api/job-roles/:id - Delete Job Role
router.delete('/:id', deleteJobRole);

export default router;
