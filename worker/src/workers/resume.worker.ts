import { Worker, Job } from 'bullmq';
import { prisma } from '../config/prisma';
import { downloadFromMinio } from '../utils/minio.util';
import { parseDocument, extractCandidateDetails } from '../services/parser.service';
import { emitSSEEvent } from '../utils/sse.util';
import { RESUME_QUEUE_NAME, redisConnectionOptions, ResumeJobData } from '../queues/resume.queue';
import Redis from 'ioredis';
//If new Redis() is placed inside the job function, a new TCP connection is opened and closed on every single file upload
const redisClient = new Redis(redisConnectionOptions);

export const resumeWorker = new Worker<ResumeJobData>(
  RESUME_QUEUE_NAME,
  async (job: Job<ResumeJobData>) => {

    const { resumeId, minioFileKey, originalFilename, recruiterId, batchId } = job.data;
    console.log(`[Worker] Processing Job #${job.id} for Resume ID '${resumeId}' (File: '${originalFilename}')`);


    try {
      await prisma.resume.update({
        where: { id: resumeId },
        data: { status: 'PROCESSING' },
      });
      //  increment processing jobs per recruiter id in redis and decrement queued jobs
      await redisClient.hincrby(`recruiter:${recruiterId}:stats`, 'processing', 1);
      await redisClient.hincrby(`recruiter:${recruiterId}:stats`, 'queued', -1);

      emitSSEEvent(batchId, {
        batchId,
        resumeId,
        originalFilename,
        status: 'PROCESSING',
        message: `Processing file '${originalFilename}'...`,
      });

      const fileBuffer = await downloadFromMinio(minioFileKey);

      let mimeType = 'application/pdf';
      const lowerName = originalFilename.toLowerCase();
      if (lowerName.endsWith('.docx')) {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (lowerName.endsWith('.png')) {
        mimeType = 'image/png';
      } else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      }

      const rawText = await parseDocument(fileBuffer, mimeType, originalFilename);
      const details = extractCandidateDetails(rawText);

      const updatedResume = await prisma.resume.update({
        where: { id: resumeId },
        data: {
          candidateName: details.candidateName,
          email: details.email,
          phone: details.phone,
          location: details.location,
          skills: details.skills,
          experienceYears: details.experienceYears,
          education: details.education,
          rawText: rawText,
          status: 'COMPLETED',
        },
      });

      const pipeline = redisClient.pipeline();
      // Increment skill frequencies in Redis for this recruiter
      if (details.skills && details.skills.length > 0) {
        for (const skill of details.skills) {
          //Recruiter-specific top skills (for recruiter dashboard)
          pipeline.zincrby(`analytics:skills:${recruiterId}`, 1, skill);
        }
      }
      const expYears = details.experienceYears || 0;
      // Track Experience Brackets for Charts (Pie/Bar)
      let bracket = '0-2 years (Entry)';
      if (expYears >= 6) {
        bracket = '6+ years (Senior)';
      } else if (expYears >= 3) {
        bracket = '3-5 years (Mid-Level)';
      }
      pipeline.hincrby(`analytics:exp_distribution:${recruiterId}`, bracket, 1);
      // Execute all Redis updates in 1 single network trip!
      await pipeline.exec();

      console.log(`[Worker] Successfully parsed Resume ID '${resumeId}' (${details.skills.length} skills found)`);

      emitSSEEvent(batchId, {
        batchId,
        resumeId: updatedResume.id,
        originalFilename,
        candidateName: updatedResume.candidateName,
        email: updatedResume.email,
        phone: updatedResume.phone,
        location: updatedResume.location,
        skills: updatedResume.skills,
        experienceYears: updatedResume.experienceYears,
        education: updatedResume.education,
        status: 'COMPLETED',
        message: `File '${originalFilename}' parsed successfully!`,
      });

      return { success: true, resumeId };
    } catch (error: any) {
      console.error(`[Worker] Error processing Job #${job.id} for Resume '${originalFilename}':`, error.message || error);

      await prisma.resume.update({
        where: { id: resumeId },
        data: { status: 'FAILED' },
      });

      emitSSEEvent(batchId, {
        batchId,
        resumeId,
        originalFilename,
        status: 'FAILED',
        error: error.message || 'Failed to parse resume document.',
      });

      throw error;
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency: 5,
  }
);

resumeWorker.on('completed', async (job) => {
  if (!job) return;
  const { recruiterId } = job.data;
  await redisClient.hincrby(`recruiter:${recruiterId}:stats`, 'processing', -1);
  await redisClient.hincrby(`recruiter:${recruiterId}:stats`, 'completed', 1);
  console.log(`[Worker] Job #${job.id} completed!`);
});

resumeWorker.on('failed', async (job, err) => {
  if (!job) return;

  const { recruiterId } = job.data;
  const isPermanentlyFailed = job.attemptsMade >= (job.opts?.attempts || 1);

  if (isPermanentlyFailed) {
    console.error(`[Worker] Job #${job.id} PERMANENTLY failed after ${job.attemptsMade} attempts:`, err.message);

    // 1. Decrement processing & Increment failed in Redis
    await redisClient.hincrby(`recruiter:${recruiterId}:stats`, 'processing', -1);
    await redisClient.hincrby(`recruiter:${recruiterId}:stats`, 'failed', 1);

    // 2. Mark DB status as FAILED only after all retries are exhausted
    await prisma.resume.update({
      where: { id: job.data.resumeId },
      data: { status: 'FAILED' },
    });
  } else {
    console.warn(`[Worker] Job #${job.id} failed attempt ${job.attemptsMade}/${job.opts.attempts}. Retrying...`);

    // Move back from processing to queued/delayed
    await redisClient.hincrby(`recruiter:${recruiterId}:stats`, 'processing', -1);
    await redisClient.hincrby(`recruiter:${recruiterId}:stats`, 'queued', 1);
  }
});

