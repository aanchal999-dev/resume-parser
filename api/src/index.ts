import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ENV } from './config/env';
import { initMinioBucket } from './utils/minio.util';
import authRoutes from './routes/auth.routes';
import jobRoleRoutes from './routes/job-role.routes';
import resumeRoutes from './routes/resume.routes';
import dashboardRoutes from './routes/dashboard.routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();
const PORT = ENV.PORT;

// Security HTTP Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);

// Restricted CORS Configuration
const allowedOrigins = ENV.CORS_ORIGIN.split(',').map(o => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, or server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy violation: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// Initialize MinIO Bucket on API Server startup
initMinioBucket().catch(err => {
  console.error('Failed to initialize MinIO bucket on API startup:', err);
});

// Basic Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Resume Parser API Microservice',
    timestamp: new Date().toISOString()
  });
});

// Authentication Routes
app.use('/api/auth', authRoutes);

// Job Role Routes
app.use('/api/job-roles', jobRoleRoutes);

// Resume Routes
app.use('/api/resumes', resumeRoutes);

// Dashboard & Analytics Routes
app.use('/api/dashboard', dashboardRoutes);

// Centralized Global Error Handling Middleware (must be registered last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 REST API Microservice running on http://localhost:${PORT}`);
});
