import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info' | 'success';
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss']
})
export class ConfirmationDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
  ) {
    // Valeurs par défaut
    this.data.confirmText = this.data.confirmText || 'Confirmer';
    this.data.cancelText = this.data.cancelText || 'Annuler';
    this.data.type = this.data.type || 'warning';
  }

  getIcon(): string {
    switch (this.data.type) {
      case 'danger':
        return 'error';
      case 'warning':
        return 'warning';
      case 'success':
        return 'check_circle';
      case 'info':
        return 'info';
      default:
        return 'help';
    }
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
