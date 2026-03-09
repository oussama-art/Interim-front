import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { ClientService } from '../../../core/services/client.service';
import { ClientCreateRequest } from '../../../core/models/user.model';
import * as XLSX from 'xlsx';

interface ClientImportRow {
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber: string;
  password: string;
  title: string;
  description: string;
  sector: string;
  nbEmployee: number;
}

interface ImportResult {
  client: ClientImportRow;
  status: 'success' | 'error';
  message?: string;
}

@Component({
  selector: 'app-import-clients',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
    MatChipsModule,
    MatDividerModule
  ],
  templateUrl: './import-clients.component.html',
  styleUrls: ['./import-clients.component.scss']
})
export class ImportClientsComponent {
  @Output() clientsImported = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  selectedFile: File | null = null;
  loading = false;
  previewing = false;
  importResults: ImportResult[] = [];
  previewClients: ClientImportRow[] = [];
  displayedColumns: string[] = ['firstName', 'lastName', 'emailAddress', 'title', 'sector', 'status'];

  constructor(
    private clientService: ClientService,
    private snackBar: MatSnackBar
  ) {}

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (this.isExcelFile(file)) {
        this.selectedFile = file;
        this.previewFile(file);
      } else {
        this.snackBar.open('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)', 'Fermer', {
          duration: 3000
        });
      }
    }
  }

  private isExcelFile(file: File): boolean {
    return file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
  }

  previewFile(file: File): void {
    this.previewing = true;
    const reader = new FileReader();

    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[];

        this.previewClients = jsonData.map(row => this.mapRowToClient(row));
        this.previewing = false;

        if (this.previewClients.length === 0) {
          this.snackBar.open('Le fichier Excel est vide', 'Fermer', { duration: 3000 });
        } else {
          this.snackBar.open(`${this.previewClients.length} client(s) trouvé(s)`, 'Fermer', {
            duration: 2000
          });
        }
      } catch (error) {
        console.error('Erreur lors de la lecture du fichier:', error);
        this.snackBar.open('Erreur lors de la lecture du fichier Excel', 'Fermer', {
          duration: 3000
        });
        this.previewing = false;
      }
    };

    reader.readAsArrayBuffer(file);
  }

  private mapRowToClient(row: any): ClientImportRow {
    return {
      firstName: row['firstName'] || row['Prénom'] || row['prenom'] || '',
      lastName: row['lastName'] || row['Nom'] || row['nom'] || '',
      emailAddress: row['emailAddress'] || row['Email'] || row['email'] || '',
      phoneNumber: row['phoneNumber'] || row['Téléphone'] || row['telephone'] || '',
      password: row['password'] || row['Mot de passe'] || 'Default@123',
      title: row['title'] || row['Entreprise'] || row['entreprise'] || '',
      description: row['description'] || row['Description'] || '',
      sector: row['sector'] || row['Secteur'] || row['secteur'] || '',
      nbEmployee: parseInt(row['nbEmployee'] || row['Nombre employés'] || row['nb_employee'] || '0')
    };
  }

  async importClients(): Promise<void> {
    if (!this.selectedFile || this.previewClients.length === 0) {
      this.snackBar.open('Aucun client à importer', 'Fermer', { duration: 3000 });
      return;
    }

    this.loading = true;
    this.importResults = [];
    let successCount = 0;
    let errorCount = 0;

    for (const client of this.previewClients) {
      try {
        // Validate client data
        if (!this.validateClient(client)) {
          this.importResults.push({
            client,
            status: 'error',
            message: 'Données invalides'
          });
          errorCount++;
          continue;
        }

        // Create client request
        const clientRequest: ClientCreateRequest = {
          firstName: client.firstName,
          lastName: client.lastName,
          emailAddress: client.emailAddress,
          phoneNumber: client.phoneNumber,
          password: client.password,
          confirmPassword: client.password,
          experienceYear: 0, // Not applicable for clients, but required by BaseUserRequest
          title: client.title,
          description: client.description,
          sector: client.sector,
          nbEmployee: client.nbEmployee
        };

        // Call API to create client
        await this.clientService.createClient(clientRequest).toPromise();

        this.importResults.push({
          client,
          status: 'success'
        });
        successCount++;
      } catch (error: any) {
        console.error('Erreur lors de la création du client:', error);
        this.importResults.push({
          client,
          status: 'error',
          message: error.error?.message || 'Erreur lors de la création'
        });
        errorCount++;
      }
    }

    this.loading = false;

    // Show results
    if (successCount > 0) {
      this.snackBar.open(
        `${successCount} client(s) importé(s) avec succès${errorCount > 0 ? `, ${errorCount} erreur(s)` : ''}`,
        'Fermer',
        { duration: 5000 }
      );

      if (errorCount === 0) {
        setTimeout(() => {
          this.clientsImported.emit();
        }, 2000);
      }
    } else {
      this.snackBar.open('Aucun client n\'a pu être importé', 'Fermer', {
        duration: 3000
      });
    }
  }

  private validateClient(client: ClientImportRow): boolean {
    return !!(
      client.firstName &&
      client.lastName &&
      client.emailAddress &&
      client.phoneNumber &&
      client.title &&
      client.sector &&
      client.nbEmployee > 0
    );
  }

  downloadTemplate(): void {
    const template = [
      {
        firstName: 'Jean',
        lastName: 'Dupont',
        emailAddress: 'jean.dupont@example.com',
        phoneNumber: '0612345678',
        password: 'Password@123',
        title: 'ACME Corp',
        description: 'Entreprise de services',
        sector: 'Informatique',
        nbEmployee: 50
      },
      {
        firstName: 'Marie',
        lastName: 'Martin',
        emailAddress: 'marie.martin@example.com',
        phoneNumber: '0623456789',
        password: 'Password@123',
        title: 'Tech Solutions',
        description: 'Solutions technologiques',
        sector: 'Technologie',
        nbEmployee: 100
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');

    // Set column widths
    const colWidths = [
      { wch: 15 }, // firstName
      { wch: 15 }, // lastName
      { wch: 30 }, // emailAddress
      { wch: 15 }, // phoneNumber
      { wch: 15 }, // password
      { wch: 20 }, // title
      { wch: 30 }, // description
      { wch: 15 }, // sector
      { wch: 12 }  // nbEmployee
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, 'modele_clients.xlsx');
    this.snackBar.open('Modèle téléchargé avec succès', 'Fermer', { duration: 2000 });
  }

  clearFile(): void {
    this.selectedFile = null;
    this.previewClients = [];
    this.importResults = [];
  }

  onCancel(): void {
    this.cancel.emit();
  }

  getSuccessCount(): number {
    return this.importResults.filter(r => r.status === 'success').length;
  }

  getErrorCount(): number {
    return this.importResults.filter(r => r.status === 'error').length;
  }

  hasErrors(): boolean {
    return this.importResults.some(r => r.status === 'error');
  }
}
