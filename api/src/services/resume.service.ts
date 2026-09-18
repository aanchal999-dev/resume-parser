import { prisma } from '../config/prisma';
import { uploadToMinio } from '../utils/minio.util';
import { addResumeToQueue, ResumeJobData } from '../queues/resume.queue';
import { redisClient } from '../utils/redis.util';

export interface UploadBatchResult {
  message: string;
  batchId: string;
  totalUploaded: number;
}

/**
 * Handles uploading resume files to MinIO storage, creating database records,
 * and pushing processing jobs to the BullMQ background queue.
 */
export async function uploadAndQueueResumes(
  files: Express.Multer.File[],
  recruiterId: string,
  batchId: string
): Promise<UploadBatchResult> {
  for (const file of files) {
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `resumes/${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${sanitizedFilename}`;

    // 1. Upload file buffer to MinIO S3 bucket
    await uploadToMinio(fileKey, file.buffer, file.mimetype);

    // 2. Create QUEUED resume record in MySQL database
    const resume = await prisma.resume.create({
      data: {
        minioFileKey: fileKey,
        originalFilename: file.originalname,
        recruiterId,
      },
    });

    // 3. Enqueue job into BullMQ Redis Queue
    const resumeDetails: ResumeJobData = {
      resumeId: resume.id,
      minioFileKey: fileKey,
      originalFilename: file.originalname,
      recruiterId,
      batchId,
    };

    await addResumeToQueue(resumeDetails);
    //increment queued job for recruiter id in redis
    await redisClient.hincrby(`recruiter:${recruiterId}:stats`, 'queued', 1);


  }

  return {
    message: `${files.length} resume(s) uploaded and queued for processing.`,
    batchId,
    totalUploaded: files.length,
  };
}
