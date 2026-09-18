import { Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobRoleService } from '../../core/services/job-role.service';

@Component({
  selector: 'app-job-role-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './job-role-modal.component.html',
  styleUrl: './job-role-modal.component.scss'
})
export class JobRoleModalComponent {
  private jobRoleService = inject(JobRoleService);

  @Output() closeModal = new EventEmitter<void>();
  @Output() roleCreated = new EventEmitter<void>();

  public title: string = '';
  public currentSkillInput: string = '';
  public minExperience: number = 2;
  public skills = signal<string[]>(['JavaScript', 'TypeScript', 'Node.js']);
  public isSubmitting = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);

  public addSkill(event: Event): void {
    event.preventDefault();
    const clean = this.currentSkillInput.replace(/,/g, '').trim();
    if (clean) {
      if (!this.skills().includes(clean)) {
        this.skills.update((curr) => [...curr, clean]);
      }
      this.currentSkillInput = '';
    }
  }

  public removeSkill(skillToRemove: string): void {
    this.skills.update((curr) => curr.filter((s) => s !== skillToRemove));
  }

  public submitRole(): void {
    if (!this.title.trim()) {
      this.errorMessage.set('Please provide a job title.');
      return;
    }
    if (this.skills().length === 0) {
      this.errorMessage.set('Please specify at least one required skill.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.jobRoleService
      .createJobRole({
        title: this.title.trim(),
        requiredSkills: this.skills(),
        minExperience: this.minExperience,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.roleCreated.emit();
          this.closeModal.emit();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.error?.message || 'Failed to create job role.');
        },
      });
  }

  public onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal.emit();
    }
  }
}
