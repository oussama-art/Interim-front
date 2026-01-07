import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';

interface Timesheet {
  id: number;
  contractRef: string;
  candidateName: string;
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  status: 'approved' | 'pending' | 'rejected';
  details: DayDetail[];
}

interface DayDetail {
  day: string;
  hours: number;
}

@Component({
  selector: 'app-timesheets',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatTableModule
  ],
  templateUrl: './timesheets.component.html',
  styleUrl: './timesheets.component.scss'
})
export class TimesheetsComponent {
  timesheets: Timesheet[] = [
    {
      id: 1,
      contractRef: 'CTR-2024-001',
      candidateName: 'Pierre Dubois',
      weekStart: '2024-12-16',
      weekEnd: '2024-12-22',
      totalHours: 38,
      status: 'approved',
      details: [
        { day: 'Lun', hours: 8 },
        { day: 'Mar', hours: 8 },
        { day: 'Mer', hours: 7 },
        { day: 'Jeu', hours: 8 },
        { day: 'Ven', hours: 7 },
      ]
    },
    {
      id: 2,
      contractRef: 'CTR-2024-002',
      candidateName: 'Marie Martin',
      weekStart: '2024-12-16',
      weekEnd: '2024-12-22',
      totalHours: 40,
      status: 'pending',
      details: [
        { day: 'Lun', hours: 8 },
        { day: 'Mar', hours: 8 },
        { day: 'Mer', hours: 8 },
        { day: 'Jeu', hours: 8 },
        { day: 'Ven', hours: 8 },
      ]
    },
    {
      id: 3,
      contractRef: 'CTR-2024-004',
      candidateName: 'Thomas Laurent',
      weekStart: '2024-12-09',
      weekEnd: '2024-12-15',
      totalHours: 35,
      status: 'approved',
      details: [
        { day: 'Lun', hours: 7 },
        { day: 'Mar', hours: 7 },
        { day: 'Mer', hours: 7 },
        { day: 'Jeu', hours: 7 },
        { day: 'Ven', hours: 7 },
      ]
    },
    {
      id: 4,
      contractRef: 'CTR-2024-001',
      candidateName: 'Pierre Dubois',
      weekStart: '2024-12-09',
      weekEnd: '2024-12-15',
      totalHours: 42,
      status: 'rejected',
      details: [
        { day: 'Lun', hours: 9 },
        { day: 'Mar', hours: 8 },
        { day: 'Mer', hours: 8 },
        { day: 'Jeu', hours: 9 },
        { day: 'Ven', hours: 8 },
      ]
    }
  ];

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'approved': 'Approuvée',
      'pending': 'En attente',
      'rejected': 'Rejetée'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }
}
