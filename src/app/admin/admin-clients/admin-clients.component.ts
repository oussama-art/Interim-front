import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { AdminService } from '../../core/services/admin.service';
import { AccountService } from '../../core/services/account.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { ClientResponse } from '../../core/models/user.model';
import { PageResponse } from '../../core/models/offer.model';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { ImportClientsComponent } from './import-clients/import-clients.component';

@Component({
  selector: 'app-admin-clients',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatMenuModule,
    ImportClientsComponent
  ],
  templateUrl: './admin-clients.component.html',
  styleUrls: ['./admin-clients.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0', display: 'none' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class AdminClientsComponent implements OnInit {
  clients: ClientResponse[] = [];
  groupedClients: any[] = [];
  expandedRows = new Set<string>();
  loading = true;
  showImport = false;
  displayedColumns: string[] = [
    'expand',
    'globalEmail',
    'companyInfo',
    'accountsCount',
    'createdAt'
  ];

  constructor(
    private adminService: AdminService,
    private accountService: AccountService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private errorHandler: ErrorHandlerService
  ) {}

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.loading = true;
    this.adminService.getAllClients().subscribe({
      next: (data: PageResponse<ClientResponse>) => {
        this.clients = data.content;
        // Charger le compte global pour chaque client
        this.loadGlobalEmails();
      },
      error: (err) => {
        console.error('Erreur lors du chargement des clients:', err);
        if (!this.errorHandler.isSessionExpired(err)) {
          this.errorHandler.handleError(err, '❌ Erreur lors du chargement des clients');
        }
        this.loading = false;
      }
    });
  }

  groupClientsByGlobalEmail(): void {
    const grouped = new Map<string, any>();

    this.clients.forEach(client => {
      const globalEmail = client.globalEmailAddress || 'Sans compte global';

      if (!grouped.has(globalEmail)) {
        grouped.set(globalEmail, {
          globalEmail: globalEmail,
          companyTitle: client.title,
          sector: client.sector,
          nbEmployee: client.nbEmployee,
          childAccounts: [],
          createdAt: client.createdAt,
          numDemande: client.numDemande
        });
      }

      grouped.get(globalEmail)!.childAccounts.push(client);
    });

    this.groupedClients = Array.from(grouped.values());
    this.loading = false;
  }

  loadGlobalEmails(): void {
    let loadedCount = 0;
    const totalToLoad = this.clients.filter(c => c.numDemande).length;

    if (totalToLoad === 0) {
      this.groupClientsByGlobalEmail();
      return;
    }

    this.clients.forEach(client => {
      if (client.numDemande) {
        this.accountService.getAccountRequestById(client.numDemande).subscribe({
          next: (accountRequest) => {
            client.globalEmailAddress = accountRequest.emailAddress;
            // Récupérer tous les emails approuvés
            if (accountRequest.emails) {
              client.approvedEmails = accountRequest.emails
                .filter(e => e.status === 'APPROVED')
                .map(e => e.email);
            }
            loadedCount++;
            if (loadedCount === totalToLoad) {
              this.groupClientsByGlobalEmail();
            }
          },
          error: (err) => {
            console.error(`Erreur lors du chargement du compte global pour la demande ${client.numDemande}:`, err);
            loadedCount++;
            if (loadedCount === totalToLoad) {
              this.groupClientsByGlobalEmail();
            }
          }
        });
      }
    });
  }

  toggleRow(globalEmail: string): void {
    if (this.expandedRows.has(globalEmail)) {
      this.expandedRows.delete(globalEmail);
    } else {
      this.expandedRows.add(globalEmail);
    }
  }

  isRowExpanded(globalEmail: string): boolean {
    return this.expandedRows.has(globalEmail);
  }

  viewClient(client: ClientResponse): void {
    this.snackBar.open(`Affichage du client: ${client.firstName} ${client.lastName}`, 'Fermer', {
      duration: 2000
    });
  }

  editClient(client: ClientResponse): void {
    this.snackBar.open(`Édition du client: ${client.firstName} ${client.lastName}`, 'Fermer', {
      duration: 2000
    });
  }

  deleteClient(client: ClientResponse): void {
    const confirmDialog = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Supprimer le client',
        message: `Êtes-vous sûr de vouloir supprimer le client ${client.firstName} ${client.lastName} ?`,
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        type: 'danger'
      }
    });

    confirmDialog.afterClosed().subscribe(result => {
      if (result) {
        this.adminService.deleteClient(client.id).subscribe({
          next: () => {
            this.snackBar.open('Client supprimé avec succès', 'Fermer', {
              duration: 3000
            });
            this.loadClients();
          },
          error: (err) => {
            console.error('Erreur lors de la suppression:', err);
            this.snackBar.open('Erreur lors de la suppression du client', 'Fermer', {
              duration: 3000
            });
          }
        });
      }
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  openImport(): void {
    this.showImport = true;
  }

  onClientsImported(): void {
    this.showImport = false;
    this.loadClients();
  }

  onImportCancelled(): void {
    this.showImport = false;
  }
}
