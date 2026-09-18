import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchedCandidate } from '../../core/models/dashboard.models';

@Component({
  selector: 'app-candidate-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './candidate-table.component.html',
  styleUrl: './candidate-table.component.scss'
})
export class CandidateTableComponent {
  @Input() candidates: MatchedCandidate[] = [];
  @Input() selectedRoleId: string | null = null;
  @Input() minMatchScore: number = 0;
  @Input() isLoading: boolean = false;

  @Output() openRoleModal = new EventEmitter<void>();
  @Output() openUploadModal = new EventEmitter<void>();

  public getUnmatchedSkills(candidate: MatchedCandidate): string[] {
    const allSkills = candidate.skills || [];
    const matched = candidate.matchingSkills || [];
    const matchedLower = matched.map((s) => s.toLowerCase().trim());
    return allSkills.filter((s) => !matchedLower.includes(s.toLowerCase().trim()));
  }
}
