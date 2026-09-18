import { Injectable } from '@angular/core';
import { MatchedCandidate } from '../models/dashboard.models';

@Injectable({
  providedIn: 'root',
})
export class CsvExportService {
  /**
   * Generates a CSV file from the list of matched candidates and triggers browser download.
   */
  public exportCandidatesToCsv(candidates: MatchedCandidate[], roleTitle: string): void {
    if (!candidates || candidates.length === 0) {
      return;
    }

    const headers = [
      'Candidate Name',
      'Email',
      'Phone',
      'Match Score (%)',
      'Experience (Years)',
      'Education',
      'Matching Skills',
      'All Skills',
      'Original Filename',
    ];

    const csvRows = candidates.map((c) => {
      return [
        this.escapeCsvField(c.candidateName || 'N/A'),
        this.escapeCsvField(c.email || 'N/A'),
        this.escapeCsvField(c.phone || 'N/A'),
        c.matchPercentage ?? 0,
        c.experienceYears ?? 0,
        this.escapeCsvField(c.education || 'N/A'),
        this.escapeCsvField((c.matchingSkills || []).join(', ')),
        this.escapeCsvField((c.skills || []).join(', ')),
        this.escapeCsvField(c.originalFilename || 'resume.pdf'),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    const sanitizedTitle = roleTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    link.setAttribute('download', `Candidate_Matches_${sanitizedTitle}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private escapeCsvField(field: string): string {
    if (!field) return '""';
    const escaped = field.replace(/"/g, '""');
    return `"${escaped}"`;
  }
}
