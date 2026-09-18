/**
 * MinIO Object Storage Utility Module (Worker Service)
 * 
 * Provides S3 download capability using AWS SDK v3 to retrieve raw resume files
 * (PDF/DOCX/Images) from MinIO storage for OCR and document text extraction.
 */

import {
  S3Client,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { ENV } from '../config/env';

/**
 * MinIO S3 Client Instance:
 * Configured with AWS S3 SDK for MinIO Object Storage (port 9000).
 * `forcePathStyle: true` is required for S3-compatible local stores.
 */
export const minioClient = new S3Client({
  endpoint: `http://${ENV.MINIO_ENDPOINT}:${ENV.MINIO_PORT}`,
  region: 'us-east-1',
  credentials: {
    accessKeyId: ENV.MINIO_ACCESS_KEY,
    secretAccessKey: ENV.MINIO_SECRET_KEY,
  },
  forcePathStyle: true,
});

/**
 * Target S3 Bucket Name for candidate resumes (default: 'resumes')
 */
export const BUCKET_NAME = ENV.MINIO_BUCKET_NAME;

/**
 * Downloads a raw file stream from MinIO and converts it into an in-memory Buffer.
 * 
 * @param {string} fileKey - Object storage path/key of the resume in MinIO.
 * @returns {Promise<Buffer>} Binary buffer of the downloaded document.
 * @throws {Error} Throws if download or stream accumulation fails.
 */
export async function downloadFromMinio(fileKey: string): Promise<Buffer> {
  try {
    const response = await minioClient.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileKey,
      })
    );

    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  } catch (error: any) {
    console.error(`Error downloading '${fileKey}' from MinIO:`, error.message || error);
    throw error;
  }
}

