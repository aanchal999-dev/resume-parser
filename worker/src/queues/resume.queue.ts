import { ENV } from '../config/env';

export const RESUME_QUEUE_NAME = 'resumeProcessingQueue';

export const redisConnectionOptions = {
  host: ENV.REDIS_HOST,
  port: ENV.REDIS_PORT,
};

export interface ResumeJobData {
  resumeId: string;
  minioFileKey: string;
  originalFilename: string;
  recruiterId: string;
  batchId: string;
}
