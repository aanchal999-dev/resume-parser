import { Queue } from 'bullmq';
import { redisConnectionOptions } from '../utils/redis.util';

/**
 * Shared name of the BullMQ Redis queue for background resume parsing tasks
 */
export const RESUME_QUEUE_NAME = 'resumeProcessingQueue';

/**
 * Type-safe interface representing the payload data passed inside each Redis job
 */
export interface ResumeJobData {
  resumeId: string;
  minioFileKey: string;
  originalFilename: string;
  recruiterId: string;
  batchId: string;
}

/**
 * BullMQ Queue Instance:
 * Produces jobs when resumes are uploaded via Express API controller.
 */
export const resumeQueue = new Queue<ResumeJobData>(RESUME_QUEUE_NAME, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3, // Automatically retry failed parsing jobs up to 3 times
    backoff: {
      type: 'exponential', // Exponential backoff retry strategy: 2s, 4s, 8s
      delay: 2000,
    },
    removeOnComplete: 100, // Retain last 100 completed jobs in Redis logs
    removeOnFail: 500,     // Retain last 500 failed jobs for debugging
  },
});

/**
 * Helper function to enqueue a newly uploaded resume for background processing
 */
export async function addResumeToQueue(jobData: ResumeJobData): Promise<string> {
  const job = await resumeQueue.add(`process-resume-${jobData.resumeId}`, jobData);
  console.log(`Pushed Job #${job.id} for Resume ID '${jobData.resumeId}' into BullMQ queue.`);
  return job.id || '';
}
export { redisConnectionOptions };

