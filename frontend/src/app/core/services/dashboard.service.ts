import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { DashboardStats, MatchedCandidate } from '../models/dashboard.models';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly API_URL = '/api/dashboard';

  public stats = signal<DashboardStats | null>(null);
  public matchedCandidates = signal<MatchedCandidate[]>([]);
  public isLoadingCandidates = signal<boolean>(false);

  constructor(private http: HttpClient) {}

  public getDashboardData(): Observable<{ success: boolean; data: DashboardStats }> {
    return this.http.get<{ success: boolean; data: DashboardStats }>(`${this.API_URL}/dashboardData`).pipe(
      tap((res) => {
        if (res.data) {
          this.stats.set(res.data);
        }
      })
    );
  }

  public getMatchedResumes(jobRoleId: string, minMatchScore: number = 0): Observable<{ success: boolean; data: MatchedCandidate[] }> {
    this.isLoadingCandidates.set(true);
    return this.http.get<{ success: boolean; data: MatchedCandidate[] }>(`${this.API_URL}/matchedResumes/${jobRoleId}/${minMatchScore}`).pipe(
      tap({
        next: (res) => {
          this.matchedCandidates.set(res.data || []);
          this.isLoadingCandidates.set(false);
        },
        error: () => {
          this.matchedCandidates.set([]);
          this.isLoadingCandidates.set(false);
        },
      })
    );
  }

  public clearCandidateMatches(): void {
    this.matchedCandidates.set([]);
  }
}
