import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { SSEProgressEvent, UploadBatchResponse } from '../models/resume.models';

@Injectable({
  providedIn: 'root',
})
export class ResumeService {
  private readonly API_URL = '/api/resumes';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  public uploadResumes(files: File[], batchId: string): Observable<UploadBatchResponse> {
    const formData = new FormData();
    formData.append('batchId', batchId);

    files.forEach((file) => {
      formData.append('files', file, file.name);
    });

    return this.http.post<UploadBatchResponse>(`${this.API_URL}/upload`, formData);
  }

  public listenToBatchStream(batchId: string): Observable<SSEProgressEvent> {
    return new Observable<SSEProgressEvent>((observer) => {
      const token = this.authService.getToken();
      const sseUrl = `${this.API_URL}/stream/${batchId}${token ? `?token=${token}` : ''}`;
      const eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const parsedData: SSEProgressEvent = JSON.parse(event.data);
          observer.next(parsedData);
        } catch (err) {
          console.error('Failed to parse SSE event data:', err);
        }
      };

      eventSource.onerror = (err) => {
        // EventSource will attempt reconnects automatically, or close when completed
        if (eventSource.readyState === EventSource.CLOSED) {
          observer.complete();
        }
      };

      // Teardown logic when subscription ends
      return () => {
        eventSource.close();
      };
    });
  }
}
