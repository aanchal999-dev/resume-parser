import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { StatsGridComponent } from '../../components/stats-grid/stats-grid.component';
import { AnalyticsChartsComponent } from '../../components/analytics-charts/analytics-charts.component';
import { FilterBarComponent } from '../../components/filter-bar/filter-bar.component';
import { CandidateTableComponent } from '../../components/candidate-table/candidate-table.component';
import { UploadModalComponent } from '../../components/upload-modal/upload-modal.component';
import { JobRoleModalComponent } from '../../components/job-role-modal/job-role-modal.component';
import { DashboardService } from '../../core/services/dashboard.service';
import { JobRoleService } from '../../core/services/job-role.service';
import { CsvExportService } from '../../core/services/csv.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    StatsGridComponent,
    AnalyticsChartsComponent,
    FilterBarComponent,
    CandidateTableComponent,
    UploadModalComponent,
    JobRoleModalComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  public dashboardService = inject(DashboardService);
  public jobRoleService = inject(JobRoleService);
  private csvExportService = inject(CsvExportService);

  public selectedRoleId = signal<string | null>(null);
  public minMatchScore = signal<number>(0);
  public showUploadModal = signal<boolean>(false);
  public showJobRoleModal = signal<boolean>(false);

  public onRoleChanged(roleId: string | null): void {
    this.selectedRoleId.set(roleId);
    if (roleId) {
      this.fetchCandidateMatches(roleId, this.minMatchScore());
    } else {
      this.dashboardService.clearCandidateMatches();
    }
  }

  public onScoreChanged(score: number): void {
    this.minMatchScore.set(score);
    const roleId = this.selectedRoleId();
    if (roleId) {
      this.fetchCandidateMatches(roleId, score);
    }
  }

  public fetchCandidateMatches(roleId: string, minScore: number): void {
    this.dashboardService.getMatchedResumes(roleId, minScore).subscribe({
      error: (err) => console.error('Error fetching matched resumes:', err),
    });
  }

  public onDataRefresh(): void {
    this.dashboardService.getDashboardData().subscribe({
      next: (res) => {
        if (res.data?.jobRoles) {
          this.jobRoleService.jobRoles.set(res.data.jobRoles);
        }
      },
      error: (err) => console.error('Failed to refresh dashboard data:', err),
    });

    const roleId = this.selectedRoleId();
    if (roleId) {
      this.fetchCandidateMatches(roleId, this.minMatchScore());
    }
  }

  public onExportCsv(): void {
    const candidates = this.dashboardService.matchedCandidates();
    const roleId = this.selectedRoleId();
    const role = this.jobRoleService.jobRoles().find((r) => r.id === roleId);
    const title = role?.title || 'Candidates';
    this.csvExportService.exportCandidatesToCsv(candidates, title);
  }
}
