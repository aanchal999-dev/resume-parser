/**
 * MinIO Object Storage Utility Module
 * 
 * Provides helper functions for interacting with MinIO (S3-compatible object storage)
 * using the official AWS SDK v3 (@aws-sdk/client-s3). Handles bucket lifecycle,
 * binary file uploads, and stream-to-buffer file retrieval.
 */

import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { ENV } from '../config/env';

/**
 * MinIO S3 Client Instance:
 * 
 * Configured to connect to the local/remote MinIO instance using AWS S3 SDK v3.
 * 
 * Key configuration options:
 * - `endpoint`: The HTTP URL pointing to MinIO server (e.g., http://localhost:9000).
 * - `region`: Dummy region 'us-east-1' (required by AWS SDK even for local MinIO).
 * - `credentials`: Access Key & Secret Key configured in environment variables.
 * - `forcePathStyle`: MUST be set to true for MinIO to route requests via path style 
 *   (e.g., http://localhost:9000/bucket-name/key) rather than AWS subdomain style 
 *   (e.g., http://bucket-name.localhost:9000/key).
 */
export const minioClient = new S3Client({
  endpoint: `http://${ENV.MINIO_ENDPOINT}:${ENV.MINIO_PORT}`,
  region: 'us-east-1',
  credentials: {
    accessKeyId: ENV.MINIO_ACCESS_KEY,
    secretAccessKey: ENV.MINIO_SECRET_KEY,
  },
  forcePathStyle: true, // Required for S3-compatible self-hosted stores like MinIO
});

/**
 * Target S3 Bucket Name for storing uploaded candidate resumes.
 * Sourced from environment configuration (default: 'resumes').
 */
export const BUCKET_NAME = ENV.MINIO_BUCKET_NAME;

/**
 * Ensures the target MinIO bucket exists on server startup.
 * 
 * Workflow:
 * 1. Sends a `HeadBucketCommand` to verify if the bucket exists and is accessible.
 * 2. If a 404 / NotFound error is caught, it creates the bucket via `CreateBucketCommand`.
 * 3. Logs bucket readiness status or errors for monitoring.
 * 
 * @returns {Promise<void>} Resolves when the bucket is verified or created.
 */
export async function initMinioBucket(): Promise<void> {
  try {
    // Check if bucket already exists
    await minioClient.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    console.log(`MinIO bucket '${BUCKET_NAME}' exists and is ready.`);
  } catch (error: any) {
    // If the bucket does not exist (404 / NotFound), create it automatically
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      console.log(`MinIO bucket '${BUCKET_NAME}' not found. Creating bucket...`);
      await minioClient.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
      console.log(`MinIO bucket '${BUCKET_NAME}' created successfully.`);
    } else {
      console.error('Error verifying MinIO bucket:', error.message || error);
    }
  }
}

/**
 * Uploads a raw file buffer to MinIO S3 Object Storage.
 * 
 * @param {string} fileKey - Unique object storage path/key (e.g., "resumes/172553-abc-resume.pdf").
 * @param {Buffer} fileBuffer - In-memory binary buffer of the uploaded file.
 * @param {string} contentType - MIME type of the file (e.g., "application/pdf").
 * @returns {Promise<string>} Resolves with the unique fileKey upon successful upload.
 * @throws {Error} Throws if the S3 PutObject operation fails.
 */
export async function uploadToMinio(
  fileKey: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<string> {
  try {
    // Send PutObject command with binary buffer payload and content-type metadata
    await minioClient.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: contentType,
      })
    );
    console.log(`Successfully uploaded '${fileKey}' to MinIO bucket '${BUCKET_NAME}'.`);
    return fileKey;
  } catch (error: any) {
    console.error(`Error uploading '${fileKey}' to MinIO:`, error.message || error);
    throw error;
  }
}

/**
 * Downloads a raw file stream from MinIO and aggregates it into a single in-memory Buffer.
 * 
 * Used by background worker services when downloading stored resumes for OCR / text extraction.
 * 
 * @param {string} fileKey - Unique object storage key of the file in MinIO.
 * @returns {Promise<Buffer>} Resolves with the complete file contents as a binary Buffer.
 * @throws {Error} Throws if the object does not exist or stream reading fails.
 */
export async function downloadFromMinio(fileKey: string): Promise<Buffer> {
  try {
    // Fetch the object stream from S3/MinIO
    const response = await minioClient.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileKey,
      })
    );

    // Cast the S3 response stream to a Node.js Readable stream
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];

    // Accumulate incoming stream chunks into a single Buffer
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

