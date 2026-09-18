import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { CreateJobRoleDto, JobRole } from '../models/job-role.models';

@Injectable({
  providedIn: 'root',
})
export class JobRoleService {
  private readonly API_URL = '/api/job-roles';

  public jobRoles = signal<JobRole[]>([]);
  public activeJobRole = signal<JobRole | null>(null);

  constructor(private http: HttpClient) {}

  public getJobRoles(): Observable<{ success: boolean; jobRoles: JobRole[] }> {
    return this.http.get<{ success: boolean; jobRoles: JobRole[] }>(this.API_URL).pipe(
      tap((res) => {
        if (res.jobRoles) {
          this.jobRoles.set(res.jobRoles);
        }
      })
    );
  }

  public createJobRole(dto: CreateJobRoleDto): Observable<{ success: boolean; jobRole: JobRole }> {
    return this.http.post<{ success: boolean; jobRole: JobRole }>(this.API_URL, dto).pipe(
      tap((res) => {
        if (res.jobRole) {
          this.jobRoles.update((roles) => [res.jobRole, ...roles]);
          this.activeJobRole.set(res.jobRole);
        }
      })
    );
  }

  public deleteJobRole(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/${id}`).pipe(
      tap(() => {
        this.jobRoles.update((roles) => roles.filter((r) => r.id !== id));
        if (this.activeJobRole()?.id === id) {
          this.activeJobRole.set(null);
        }
      })
    );
  }
}
