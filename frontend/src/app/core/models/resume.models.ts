export interface UploadBatchResponse {
  message: string;
  batchId: string;
  totalUploaded: number;
}

export type ProcessingStatus = 'QUEUED' | 'PARSING' | 'COMPLETED' | 'FAILED';

export interface SSEProgressEvent {
  status: ProcessingStatus;
  batchId: string;
  resumeId?: string;
  originalFilename?: string;
  candidateName?: string;
  email?: string;
  skills?: string[];
  experienceYears?: number;
  education?: string;
  error?: string;
  message?: string;
}
