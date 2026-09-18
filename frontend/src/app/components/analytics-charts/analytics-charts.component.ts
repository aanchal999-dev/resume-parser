import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { DashboardStats } from '../../core/models/dashboard.models';

@Component({
  selector: 'app-analytics-charts',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './analytics-charts.component.html',
  styleUrl: './analytics-charts.component.scss'
})
export class AnalyticsChartsComponent implements OnChanges {
  @Input() stats: DashboardStats | null = null;

  public hasSkillsData = false;
  public hasExpData = false;

  // Bar Chart (Top 5 Skills)
  public barChartType: 'bar' = 'bar';
  public barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Candidate Count',
        backgroundColor: 'rgba(79, 70, 229, 0.85)',
        borderColor: '#4f46e5',
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  public barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#475569', font: { family: 'Inter', size: 11, weight: 600 } },
      },
      y: {
        grid: { color: '#e2e8f0' },
        ticks: { color: '#64748b', stepSize: 1, font: { family: 'Inter', size: 11 } },
      },
    },
  };

  // Doughnut Chart (Experience Distribution)
  public doughnutChartType: 'doughnut' = 'doughnut';
  public doughnutChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [
          '#10b981',
          '#06b6d4',
          '#6366f1',
          '#f59e0b',
          '#ef4444',
        ],
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  public doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#334155',
          boxWidth: 12,
          padding: 14,
          font: { family: 'Inter', size: 12, weight: 500 },
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
      },
    },
    cutout: '70%',
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['stats'] && this.stats) {
      this.updateCharts();
    }
  }

  private updateCharts(): void {
    if (!this.stats) return;

    // 1. Update Top Skills
    if (this.stats.topSkills && this.stats.topSkills.length > 0) {
      this.hasSkillsData = true;
      this.barChartData = {
        labels: this.stats.topSkills.map((s) => s.skill),
        datasets: [
          {
            data: this.stats.topSkills.map((s) => s.count),
            label: 'Candidate Count',
            backgroundColor: 'rgba(79, 70, 229, 0.85)',
            borderColor: '#4f46e5',
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      };
    } else {
      this.hasSkillsData = false;
    }

    // 2. Update Experience Distribution
    if (this.stats.expDistribution && Object.keys(this.stats.expDistribution).length > 0) {
      this.hasExpData = true;
      const labels = Object.keys(this.stats.expDistribution);
      const data = labels.map((k) => parseInt(this.stats!.expDistribution[k], 10) || 0);

      this.doughnutChartData = {
        labels,
        datasets: [
          {
            data,
            backgroundColor: [
              '#10b981',
              '#06b6d4',
              '#6366f1',
              '#f59e0b',
              '#ef4444',
            ],
            borderColor: '#ffffff',
            borderWidth: 2,
          },
        ],
      };
    } else {
      this.hasExpData = false;
    }
  }
}
