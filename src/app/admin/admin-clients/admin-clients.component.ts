import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AdminService } from '../../core/services/admin.service';
import { ClientResponse } from '../../core/models/user.model';

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
    MatDialogModule
  ],
  templateUrl: './admin-clients.component.html',
  styleUrls: ['./admin-clients.component.scss']
})
export class AdminClientsComponent implements OnInit {
  clients: ClientResponse[] = [];
  loading = true;
  displayedColumns: string[] = [
    'id',
    'firstName',
    'lastName',
    'emailAddress',
    'phoneNumber',
    'title',
    'sector',
    'nbEmployee',
    'createdAt',
    'actions'
  ];

  constructor(
    private adminService: AdminService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.loading = true;
    this.adminService.getAllClients().subscribe({
      next: (data) => {
        this.clients = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des clients:', err);
        this.snackBar.open('Erreur lors du chargement des clients', 'Fermer', {
          duration: 3000
        });
        this.loading = false;
      }
    });
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
    if (confirm(`Êtes-vous sûr de vouloir supprimer le client ${client.firstName} ${client.lastName} ?`)) {
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
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }
}
