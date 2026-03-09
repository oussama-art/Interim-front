import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';

export interface AcceptCandidateData {
  candidateName: string;
}

export interface AcceptCandidateResult {
  startDate: string;
  endDate: string;
}

@Component({
  selector: 'app-accept-candidate-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    FormsModule
  ],
  templateUrl: './accept-candidate-dialog.component.html',
  styleUrls: ['./accept-candidate-dialog.component.scss']
})
export class AcceptCandidateDialogComponent {
  startDate: Date | null = null;
  endDate: Date | null = null;

  constructor(
    public dialogRef: MatDialogRef<AcceptCandidateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AcceptCandidateData
  ) {}

  onConfirm(): void {
    if (this.startDate && this.endDate) {
      const result: AcceptCandidateResult = {
        startDate: this.formatDate(this.startDate),
        endDate: this.formatDate(this.endDate)
      };
      this.dialogRef.close(result);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  isValid(): boolean {
    return this.startDate !== null && this.endDate !== null && this.startDate <= this.endDate;
  }
}
