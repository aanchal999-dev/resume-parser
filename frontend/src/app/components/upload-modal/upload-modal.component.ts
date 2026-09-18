import { Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResumeService } from '../../core/services/resume.service';
import { SSEProgressEvent } from '../../core/models/resume.models';

interface UploadItem {
  file: File;
  status: 'PENDING' | 'QUEUED' | 'PARSING' | 'COMPLETED' | 'FAILED';
  candidateName?: string;
  skillsCount?: number;
  error?: string;
}

@Component({
  selector: 'app-upload-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload-modal.component.html',
  styleUrl: './upload-modal.component.scss'
})
export class UploadModalComponent {
  private resumeService = inject(ResumeService);

  @Output() closeModal = new EventEmitter<void>();
  @Output() uploadCompleted = new EventEmitter<void>();

  public isDragging = false;
  public isUploading = signal<boolean>(false);
  public isProcessing = signal<boolean>(false);
  public isBatchDone = signal<boolean>(false);
  public selectedFiles = signal<UploadItem[]>([]);
  public completedCount = signal<number>(0);

  public onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  public onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  public onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files) {
      this.addFiles(Array.from(files));
    }
  }

  public onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
    }
  }

  public addFiles(files: File[]): void {
    const valid = files.filter((f) => f.name.match(/\.(pdf|docx|doc)$/i));
    const items: UploadItem[] = valid.map((file) => ({
      file,
      status: 'PENDING',
    }));
    this.selectedFiles.update((curr) => [...curr, ...items]);
  }

  public removeFile(item: UploadItem): void {
    this.selectedFiles.update((curr) => curr.filter((f) => f !== item));
  }

  public startUpload(): void {
    const items = this.selectedFiles();
    if (items.length === 0) return;

    this.isUploading.set(true);
    const batchId = `batch-${Date.now()}`;
    const rawFiles = items.map((i) => i.file);

    // 1. Connect to SSE stream first
    const sseSub = this.resumeService.listenToBatchStream(batchId).subscribe({
      next: (event: SSEProgressEvent) => {
        this.handleSSEEvent(event);
      },
      error: (err) => {
        console.error('SSE connection error:', err);
      },
    });

    // 2. Dispatch upload to backend
    this.resumeService.uploadResumes(rawFiles, batchId).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.isProcessing.set(true);
        // Mark all items as QUEUED
        this.selectedFiles.update((files) =>
          files.map((f) => ({ ...f, status: 'QUEUED' }))
        );
      },
      error: (err) => {
        this.isUploading.set(false);
        console.error('Failed to upload resumes:', err);
      },
    });
  }

  private handleSSEEvent(event: SSEProgressEvent): void {
    if (event.originalFilename) {
      this.selectedFiles.update((files) =>
        files.map((f) => {
          if (f.file.name === event.originalFilename) {
            return {
              ...f,
              status: event.status,
              candidateName: event.candidateName,
              skillsCount: event.skills?.length,
              error: event.error,
            };
          }
          return f;
        })
      );
    }

    // Count how many files reached terminal state
    const done = this.selectedFiles().filter(
      (f) => f.status === 'COMPLETED' || f.status === 'FAILED'
    ).length;
    this.completedCount.set(done);

    if (done === this.selectedFiles().length && done > 0) {
      this.isBatchDone.set(true);
    }
  }

  public progressPercentage(): number {
    const total = this.selectedFiles().length;
    if (total === 0) return 0;
    return Math.round((this.completedCount() / total) * 100);
  }

  public onFinish(): void {
    this.uploadCompleted.emit();
    this.closeModal.emit();
  }

  public onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      if (!this.isProcessing() || this.isBatchDone()) {
        this.closeModal.emit();
      }
    }
  }

  public formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
}
