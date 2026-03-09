import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../../core/services/account.service';
import { AccountCreationResponse, AccountApprovalRequest, CreatedAccountInfo } from '../../../core/models/account.model';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { CreatedAccountsDialogComponent } from '../created-accounts-dialog/created-accounts-dialog.component';
import { AccountRequestEditDialogComponent } from '../account-request-edit-dialog/account-request-edit-dialog.component';
import { ClientService } from '../../../core/services/client.service';
import { ClientResponse } from '../../../core/models/user.model';
import { EmailStatusFilterPipe } from '../../../shared/pipes/email-status-filter.pipe';

@Component({
  selector: 'app-account-request-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTableModule,
    FormsModule,
    EmailStatusFilterPipe,
    CreatedAccountsDialogComponent
  ],
  templateUrl: './account-request-detail-dialog.component.html',
  styleUrls: ['./account-request-detail-dialog.component.scss']
})
export class AccountRequestDetailDialogComponent implements OnInit {
  request: AccountCreationResponse;
  showRejectInput = false;
  rejectionReason = '';
  isProcessing = false;
  linkedClients: ClientResponse[] = [];
  loadingClients = false;
  clientsDisplayedColumns: string[] = ['id', 'firstName', 'lastName', 'emailAddress', 'phoneNumber'];
  selectedEmails: Set<string> = new Set();
  selectAll = false;

  constructor(
    public dialogRef: MatDialogRef<AccountRequestDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { request: AccountCreationResponse },
    private accountService: AccountService,
    private clientService: ClientService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.request = data.request;
  }

  ngOnInit(): void {
    // Initialiser la sélection de tous les emails par défaut
    if (this.request.emails && this.request.emails.length > 0) {
      this.request.emails.forEach(emailObj => this.selectedEmails.add(emailObj.email));
      this.selectAll = true;
    }

    // Charger les clients liés si la demande est approuvée
    if (this.request.status === 'APPROVED') {
      this.loadLinkedClients();
    }
  }

  loadLinkedClients(): void {
    this.loadingClients = true;
    this.clientService.getClientsByAccountRequest(this.request.id).subscribe({
      next: (clients) => {
        this.linkedClients = clients;
        this.loadingClients = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des clients liés:', err);
        this.loadingClients = false;
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

  toggleEmailSelection(email: string): void {
    if (this.selectedEmails.has(email)) {
      this.selectedEmails.delete(email);
    } else {
      this.selectedEmails.add(email);
    }
    this.updateSelectAllState();
  }

  toggleSelectAll(): void {
    if (this.selectAll) {
      this.selectedEmails.clear();
      this.selectAll = false;
    } else {
      if (this.request.emails) {
        this.request.emails.forEach(emailObj => this.selectedEmails.add(emailObj.email));
      }
      this.selectAll = true;
    }
  }

  updateSelectAllState(): void {
    if (!this.request.emails) {
      this.selectAll = false;
      return;
    }
    this.selectAll = this.selectedEmails.size === this.request.emails.length;
  }

  isEmailSelected(email: string): boolean {
    return this.selectedEmails.has(email);
  }

  getSelectedCount(): number {
    return this.selectedEmails.size;
  }

  getSelectedPendingCount(): number {
    if (!this.request.emails) return 0;
    const pendingEmails = this.request.emails.filter(e => e.status === 'PENDING');
    return Array.from(this.selectedEmails).filter(email =>
      pendingEmails.some(pe => pe.email === email)
    ).length;
  }

  getEmailStatus(email: string): 'APPROVED' | 'REJECTED' | 'PENDING' {
    if (!this.request.emails) {
      return 'PENDING';
    }
    const emailObj = this.request.emails.find(e => e.email === email);
    return emailObj?.status || 'PENDING';
  }

  getEmailStatusLabel(email: string): string {
    const status = this.getEmailStatus(email);
    switch (status) {
      case 'APPROVED':
        return 'Approuvé';
      case 'REJECTED':
        return 'Rejeté';
      case 'PENDING':
        return 'En attente';
    }
  }

  getEmailStatusClass(email: string): string {
    return this.getEmailStatus(email).toLowerCase();
  }

  hasPendingEmails(): boolean {
    return this.request.emails?.some(e => e.status === 'PENDING') || false;
  }

  toggleSelectAllPending(): void {
    if (!this.request.emails) return;

    const pendingEmails = this.request.emails.filter(e => e.status === 'PENDING');
    const allPendingSelected = pendingEmails.every(e => this.selectedEmails.has(e.email));

    if (allPendingSelected) {
      // Désélectionner tous les pending
      pendingEmails.forEach(e => this.selectedEmails.delete(e.email));
    } else {
      // Sélectionner tous les pending
      pendingEmails.forEach(e => this.selectedEmails.add(e.email));
    }
  }

  isAllPendingSelected(): boolean {
    if (!this.request.emails) return false;
    const pendingEmails = this.request.emails.filter(e => e.status === 'PENDING');
    if (pendingEmails.length === 0) return false;
    return pendingEmails.every(e => this.selectedEmails.has(e.email));
  }

  approvePendingEmails(): void {
    // Filtrer uniquement les emails PENDING sélectionnés
    const pendingEmails = this.request.emails?.filter(e => e.status === 'PENDING') || [];
    const selectedPendingEmails = Array.from(this.selectedEmails).filter(email =>
      pendingEmails.some(pe => pe.email === email)
    );

    if (selectedPendingEmails.length === 0) {
      this.snackBar.open('Veuillez sélectionner au moins un compte en attente', 'Fermer', {
        duration: 3000
      });
      return;
    }

    const selectedEmailsList = selectedPendingEmails;
    const confirmDialog = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Approuver les comptes en attente',
        message: `Êtes-vous sûr de vouloir approuver ${selectedEmailsList.length} compte(s) en attente pour ${this.request.companyTitle} ?`,
        confirmText: 'Approuver',
        cancelText: 'Annuler',
        type: 'success'
      }
    });

    confirmDialog.afterClosed().subscribe(result => {
      if (result) {
        this.isProcessing = true;
        const approvalData: AccountApprovalRequest = {
          firstName: this.request.firstName,
          lastName: this.request.lastName,
          emailAddress: this.request.emailAddress,
          selectedEmails: selectedEmailsList,
          phoneNumber: this.request.phoneNumber,
          experienceYear: this.request.experienceYear,
          companyTitle: this.request.companyTitle,
          companyDescription: this.request.companyDescription,
          sector: this.request.sector,
          nbEmployee: this.request.nbEmployee,
          requestedAccounts: selectedEmailsList.length
        };

        this.accountService.approveAccountRequest(this.request.id, approvalData).subscribe({
          next: (createdAccounts: CreatedAccountInfo[]) => {
            console.log('Réponse du backend:', createdAccounts);
            this.isProcessing = false;

            if (createdAccounts && createdAccounts.length > 0) {
              console.log('Ouverture du dialog avec', createdAccounts.length, 'comptes');
              // Show passwords dialog
              const passwordDialog = this.dialog.open(CreatedAccountsDialogComponent, {
                width: '900px',
                maxWidth: '95vw',
                maxHeight: '90vh',
                disableClose: true,
                data: {
                  accounts: createdAccounts,
                  companyTitle: this.request.companyTitle
                }
              });

              // Attendre que l'utilisateur ferme le dialog des mots de passe
              passwordDialog.afterClosed().subscribe(() => {
                console.log('Dialog des mots de passe fermé');
                this.dialogRef.close('approved');
              });
            } else {
              console.log('Aucun compte créé ou liste vide');
              this.snackBar.open(`${selectedEmailsList.length} compte(s) approuvé(s) avec succès`, 'Fermer', {
                duration: 3000,
                panelClass: ['success-snackbar']
              });
              this.dialogRef.close('approved');
            }
          },
          error: (err) => {
            console.error('Erreur lors de l\'approbation:', err);
            this.snackBar.open('Erreur lors de l\'approbation', 'Fermer', {
              duration: 3000
            });
            this.isProcessing = false;
          }
        });
      }
    });
  }

  approveRequest(): void {
    if (this.selectedEmails.size === 0 && this.request.emails && this.request.emails.length > 0) {
      this.snackBar.open('Veuillez sélectionner au moins un email à approuver', 'Fermer', {
        duration: 3000
      });
      return;
    }

    const selectedEmailsList = Array.from(this.selectedEmails);
    const message = selectedEmailsList.length > 0
      ? `Êtes-vous sûr de vouloir approuver ${selectedEmailsList.length} compte(s) pour ${this.request.companyTitle} ?`
      : `Êtes-vous sûr de vouloir approuver l'inscription de ${this.request.companyTitle} ?`;

    const confirmDialog = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Approuver la demande',
        message: message,
        confirmText: 'Approuver',
        cancelText: 'Annuler',
        type: 'success'
      }
    });

    confirmDialog.afterClosed().subscribe(result => {
      if (result) {
        this.isProcessing = true;
        const selectedEmailsList = Array.from(this.selectedEmails);

        // Construire le payload complet avec toutes les informations
        const approvalData: AccountApprovalRequest = {
          firstName: this.request.firstName,
          lastName: this.request.lastName,
          emailAddress: this.request.emailAddress,
          selectedEmails: selectedEmailsList,
          phoneNumber: this.request.phoneNumber,
          experienceYear: this.request.experienceYear,
          companyTitle: this.request.companyTitle,
          companyDescription: this.request.companyDescription,
          sector: this.request.sector,
          nbEmployee: this.request.nbEmployee,
          requestedAccounts: selectedEmailsList.length > 0 ? selectedEmailsList.length : this.request.requestedAccounts
        };

        this.accountService.approveAccountRequest(this.request.id, approvalData).subscribe({
          next: (createdAccounts: CreatedAccountInfo[]) => {
            console.log('Réponse du backend:', createdAccounts);
            this.isProcessing = false;

            if (createdAccounts && createdAccounts.length > 0) {
              console.log('Ouverture du dialog avec', createdAccounts.length, 'comptes');
              // Show passwords dialog
              const passwordDialog = this.dialog.open(CreatedAccountsDialogComponent, {
                width: '900px',
                maxWidth: '95vw',
                maxHeight: '90vh',
                disableClose: true,
                data: {
                  accounts: createdAccounts,
                  companyTitle: this.request.companyTitle
                }
              });

              // Attendre que l'utilisateur ferme le dialog des mots de passe
              passwordDialog.afterClosed().subscribe(() => {
                console.log('Dialog des mots de passe fermé');
                this.dialogRef.close('approved');
              });
            } else {
              console.log('Aucun compte créé ou liste vide');
              const count = selectedEmailsList.length > 0 ? selectedEmailsList.length : 1;
              this.snackBar.open(`Demande approuvée avec succès (${count} compte(s) créé(s))`, 'Fermer', {
                duration: 3000,
                panelClass: ['success-snackbar']
              });
              this.dialogRef.close('approved');
            }
          },
          error: (err) => {
            console.error('Erreur lors de l\'approbation:', err);
            this.snackBar.open('Erreur lors de l\'approbation', 'Fermer', {
              duration: 3000
            });
            this.isProcessing = false;
          }
        });
      }
    });
  }

  toggleRejectInput(): void {
    this.showRejectInput = !this.showRejectInput;
    if (!this.showRejectInput) {
      this.rejectionReason = '';
    }
  }

  rejectRequest(): void {
    if (!this.rejectionReason.trim()) {
      this.snackBar.open('Veuillez indiquer une raison de rejet', 'Fermer', {
        duration: 3000
      });
      return;
    }

    this.isProcessing = true;
    this.accountService.rejectAccountRequest(this.request.id, this.rejectionReason).subscribe({
      next: () => {
        this.snackBar.open('Demande rejetée', 'Fermer', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.dialogRef.close('rejected');
      },
      error: (err) => {
        console.error('Erreur lors du rejet:', err);
        this.snackBar.open('Erreur lors du rejet', 'Fermer', {
          duration: 3000
        });
        this.isProcessing = false;
      }
    });
  }

  deleteRequest(): void {
    const confirmDialog = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Supprimer la demande',
        message: `Êtes-vous sûr de vouloir supprimer définitivement l'inscription de ${this.request.companyTitle} ? Cette action est irréversible.`,
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        type: 'danger'
      }
    });

    confirmDialog.afterClosed().subscribe(result => {
      if (result) {
        this.isProcessing = true;
        this.accountService.deleteAccountRequest(this.request.id).subscribe({
          next: () => {
            this.snackBar.open('Demande supprimée avec succès', 'Fermer', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.dialogRef.close('deleted');
          },
          error: (err) => {
            console.error('Erreur lors de la suppression:', err);
            this.snackBar.open('Erreur lors de la suppression', 'Fermer', {
              duration: 3000
            });
            this.isProcessing = false;
          }
        });
      }
    });
  }

  editRequest(): void {
    const editDialog = this.dialog.open(AccountRequestEditDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { request: this.request },
      disableClose: true
    });

    editDialog.afterClosed().subscribe(result => {
      if (result === 'updated') {
        this.dialogRef.close('updated');
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
