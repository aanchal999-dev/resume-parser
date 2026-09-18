import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobRole } from '../../core/models/job-role.models';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filter-bar.component.html',
  styleUrl: './filter-bar.component.scss'
})
export class FilterBarComponent {
  @Input() jobRoles: JobRole[] = [];
  @Input() selectedRoleId: string | null = null;
  @Input() minMatchScore: number = 0;
  @Input() canExport: boolean = false;

  @Output() roleChanged = new EventEmitter<string | null>();
  @Output() scoreChanged = new EventEmitter<number>();
  @Output() openRoleModal = new EventEmitter<void>();
  @Output() openUploadModal = new EventEmitter<void>();
  @Output() exportCsv = new EventEmitter<void>();

  public onRoleChange(roleId: string | null): void {
    this.roleChanged.emit(roleId);
  }

  public onScoreChange(score: number): void {
    this.scoreChanged.emit(score);
  }
}
