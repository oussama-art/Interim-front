import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ContractDetailsDialog } from '../../shared/components/ContractDetailsDialog/contract-details-dialog.component';
import { ContractEditDialog } from '../../shared/components/ContractEditDialog/contract-edit-dialog.component';
import { ContractAddDialog } from '../../shared/components/ContractAddDialog/contract-add-dialog.component';

interface Contract {
  id: number;
  reference: string;
  candidateName: string;
  clientName: string;
  position: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'pending';
  salary: number;
}

@Component({
  selector: 'app-contracts',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatMenuModule,
    MatDialogModule,
  ],
  templateUrl: './contracts.component.html',
  styleUrl: './contracts.component.scss',
})
export class ContractsComponent {
  constructor(private dialog: MatDialog) {}
  contracts: Contract[] = [
    {
      id: 1,
      reference: 'CTR-2024-001',
      candidateName: 'Pierre Dubois',
      clientName: 'Tech Solutions SA',
      position: 'Développeur Full Stack',
      startDate: '2024-01-15',
      endDate: '2024-06-15',
      status: 'active',
      salary: 3500,
    },
    {
      id: 2,
      reference: 'CTR-2024-002',
      candidateName: 'Marie Martin',
      clientName: 'Digital Agency SARL',
      position: 'Designer UI/UX',
      startDate: '2024-02-01',
      endDate: '2024-08-01',
      status: 'active',
      salary: 3200,
    },
    {
      id: 3,
      reference: 'CTR-2023-089',
      candidateName: 'Jean Lefebvre',
      clientName: 'Construction Pro',
      position: 'Chef de chantier',
      startDate: '2023-11-01',
      endDate: '2024-01-31',
      status: 'completed',
      salary: 4200,
    },
    {
      id: 4,
      reference: 'CTR-2024-003',
      candidateName: 'Sophie Bernard',
      clientName: 'Finance Corp',
      position: 'Comptable',
      startDate: '2024-03-01',
      endDate: '2024-09-01',
      status: 'pending',
      salary: 2800,
    },
    {
      id: 5,
      reference: 'CTR-2024-004',
      candidateName: 'Thomas Laurent',
      clientName: 'Logistique Express',
      position: 'Responsable logistique',
      startDate: '2024-02-15',
      endDate: '2024-08-15',
      status: 'active',
      salary: 3600,
    },
  ];

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      active: 'Actif',
      completed: 'Terminé',
      pending: 'En attente',
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }
  openConsultDialog(contract: any) {
    this.dialog.open(ContractDetailsDialog, {
      width: '800px',
      maxWidth: '95vw',
      panelClass: 'modern-dialog-panel',
      data: contract,
    });
  }
  openEditDialog(contract: any) {
    const dialogRef = this.dialog.open(ContractEditDialog, {
      width: '800px',
      maxWidth: '95vw',
      panelClass: 'modern-dialog-panel',
      data: { ...contract }, // On envoie une copie pour ne pas modifier l'original par accident
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log('Données mises à jour :', result);
        // Ici, appelez votre service pour sauvegarder en DB
        const index = this.contracts.findIndex((c) => c.id === contract.id);
        this.contracts[index] = { ...this.contracts[index], ...result };
      }
    });
  }
  // N'oubliez pas d'importer ContractAddDialog en haut
openAddDialog() {
  console.log('Tentative d ouverture de la popover...'); // Debug
  
  try {
    const dialogRef = this.dialog.open(ContractAddDialog, {
      width: '800px',
      maxWidth: '95vw',
      panelClass: 'modern-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Popover fermée, résultat:', result);
    });
  } catch (error) {
    console.error('Erreur lors de l\'ouverture :', error);
  }
}
}
