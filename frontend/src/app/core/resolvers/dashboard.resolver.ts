import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { DashboardService } from '../services/dashboard.service';
import { JobRoleService } from '../services/job-role.service';
import { DashboardStats } from '../models/dashboard.models';
import { catchError, map, of, tap } from 'rxjs';

/**
 * Functional Route Resolver: Pre-fetches dashboard statistics & active job roles
 * prior to activating the DashboardComponent view.
 */
export const dashboardResolver: ResolveFn<DashboardStats | null> = (route, state) => {
  const dashboardService = inject(DashboardService);
  const jobRoleService = inject(JobRoleService);

  return dashboardService.getDashboardData().pipe(
    tap((res) => {
      // Synchronously prime the shared job roles signal for filters and dropdowns
      if (res.data?.jobRoles) {
        jobRoleService.jobRoles.set(res.data.jobRoles);
      }
    }),
    map((res) => res.data),
    catchError((error) => {
      console.error('Failed to pre-fetch dashboard data in resolver:', error);
      return of(null);
    })
  );
};
