import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CreatedAccountInfo } from '../../../core/models/account.model';

@Component({
  selector: 'app-created-accounts-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './created-accounts-dialog.component.html',
  styleUrls: ['./created-accounts-dialog.component.scss']
})
export class CreatedAccountsDialogComponent {
  accounts: CreatedAccountInfo[];
  displayedColumns: string[] = ['email', 'password', 'actions'];
  companyTitle: string;

  constructor(
    public dialogRef: MatDialogRef<CreatedAccountsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { accounts: CreatedAccountInfo[], companyTitle: string },
    private snackBar: MatSnackBar
  ) {
    this.accounts = data.accounts;
    this.companyTitle = data.companyTitle;
  }

  copyPassword(password: string): void {
    navigator.clipboard.writeText(password).then(() => {
      this.snackBar.open('Mot de passe copié', 'Fermer', {
        duration: 2000,
        panelClass: ['success-snackbar']
      });
    });
  }

  copyAllAccounts(): void {
    const text = this.accounts
      .map(account => `Email: ${account.email}\nMot de passe: ${account.password}`)
      .join('\n\n');

    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open('Tous les comptes copiés', 'Fermer', {
        duration: 2000,
        panelClass: ['success-snackbar']
      });
    });
  }

  downloadAccounts(): void {
    const text = this.accounts
      .map(account => `Email: ${account.email}\nMot de passe: ${account.password}`)
      .join('\n\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comptes-${this.companyTitle.replace(/\s+/g, '-')}-${new Date().getTime()}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  close(): void {
    this.dialogRef.close();
  }
}
