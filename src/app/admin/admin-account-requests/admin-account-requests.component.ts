import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AccountService } from '../../core/services/account.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { AccountCreationResponse } from '../../core/models/account.model';
import { AccountRequestDetailDialogComponent } from './account-request-detail-dialog/account-request-detail-dialog.component';
import { AccountRequestEditDialogComponent } from './account-request-edit-dialog/account-request-edit-dialog.component';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-admin-account-requests',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './admin-account-requests.component.html',
  styleUrls: ['./admin-account-requests.component.scss']
})
export class AdminAccountRequestsComponent implements OnInit {
  accountRequests: AccountCreationResponse[] = [];
  loading = true;
  displayedColumns: string[] = [
    'id',
    'companyTitle',
    'firstName',
    'lastName',
    'emailAddress',
    'requestedAccounts',
    'status',
    'createdAt',
    'actions'
  ];

  constructor(
    private accountService: AccountService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private errorHandler: ErrorHandlerService
  ) {}

  ngOnInit(): void {
    this.loadAccountRequests();
  }

  loadAccountRequests(): void {
    this.loading = true;
    this.accountService.getAllAccountRequests().subscribe({
      next: (data) => {
        this.accountRequests = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des demandes:', err);
        if (!this.errorHandler.isSessionExpired(err)) {
          this.errorHandler.handleError(err, '❌ Erreur lors du chargement des demandes de compte');
        }
        this.loading = false;
      }
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'warn';
      case 'APPROVED':
        return 'primary';
      case 'REJECTED':
        return 'accent';
      default:
        return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'En attente';
      case 'APPROVED':
        return 'Approuvé';
      case 'REJECTED':
        return 'Rejeté';
      default:
        return status;
    }
  }

  getPendingCount(): number {
    return this.accountRequests.filter(r => r.status === 'PENDING').length;
  }

  getApprovedCount(): number {
    return this.accountRequests.filter(r => r.status === 'APPROVED').length;
  }

  getRejectedCount(): number {
    return this.accountRequests.filter(r => r.status === 'REJECTED').length;
  }

  viewDetails(request: AccountCreationResponse): void {
    const dialogRef = this.dialog.open(AccountRequestDetailDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { request },
      panelClass: 'account-request-detail-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'approved' || result === 'rejected' || result === 'deleted' || result === 'updated') {
        this.loadAccountRequests();
      }
    });
  }

  editRequest(request: AccountCreationResponse, event: Event): void {
    event.stopPropagation();

    const dialogRef = this.dialog.open(AccountRequestEditDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { request },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'updated') {
        this.loadAccountRequests();
      }
    });
  }

  deleteRequest(request: AccountCreationResponse, event: Event): void {
    event.stopPropagation();

    const confirmDialog = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Supprimer la demande',
        message: `Êtes-vous sûr de vouloir supprimer l'inscription de ${request.companyTitle} ?`,
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        type: 'danger'
      }
    });

    confirmDialog.afterClosed().subscribe(result => {
      if (result) {
        this.accountService.deleteAccountRequest(request.id).subscribe({
          next: () => {
            this.snackBar.open('Demande supprimée avec succès', 'Fermer', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.loadAccountRequests();
          },
          error: (err) => {
            console.error('Erreur lors de la suppression:', err);
            if (!this.errorHandler.isSessionExpired(err)) {
              this.errorHandler.handleError(err, '❌ Erreur lors de la suppression de la demande');
            }
          }
        });
      }
    });
  }
}
