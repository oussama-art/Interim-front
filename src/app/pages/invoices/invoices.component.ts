import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';

interface Invoice {
  id: number;
  invoiceNumber: string;
  clientName: string;
  contractRef: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
}

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule
  ],
  templateUrl: './invoices.component.html',
  styleUrl: './invoices.component.scss'
})
export class InvoicesComponent {
  invoices: Invoice[] = [
    {
      id: 1,
      invoiceNumber: 'INV-2024-001',
      clientName: 'Tech Solutions SA',
      contractRef: 'CTR-2024-001',
      amount: 3500,
      issueDate: '2024-12-01',
      dueDate: '2024-12-31',
      status: 'pending'
    },
    {
      id: 2,
      invoiceNumber: 'INV-2024-002',
      clientName: 'Digital Agency SARL',
      contractRef: 'CTR-2024-002',
      amount: 3200,
      issueDate: '2024-12-01',
      dueDate: '2024-12-31',
      status: 'pending'
    },
    {
      id: 3,
      invoiceNumber: 'INV-2024-003',
      clientName: 'Construction Pro',
      contractRef: 'CTR-2023-089',
      amount: 4200,
      issueDate: '2024-11-01',
      dueDate: '2024-11-30',
      status: 'paid'
    },
    {
      id: 4,
      invoiceNumber: 'INV-2024-004',
      clientName: 'Logistique Express',
      contractRef: 'CTR-2024-004',
      amount: 3600,
      issueDate: '2024-11-15',
      dueDate: '2024-12-15',
      status: 'overdue'
    },
    {
      id: 5,
      invoiceNumber: 'INV-2024-005',
      clientName: 'Finance Corp',
      contractRef: 'CTR-2024-003',
      amount: 2800,
      issueDate: '2024-11-01',
      dueDate: '2024-11-30',
      status: 'paid'
    }
  ];

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'paid': 'Payée',
      'pending': 'En attente',
      'overdue': 'En retard'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  getTotalAmount(): number {
    return this.invoices.reduce((sum, inv) => sum + inv.amount, 0);
  }

  getPendingAmount(): number {
    return this.invoices
      .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.amount, 0);
  }
}
