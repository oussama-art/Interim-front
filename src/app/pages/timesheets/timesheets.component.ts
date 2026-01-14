import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

interface DayDetail {
  day: string;
  date: string;
  hours: number;
  notes: string;
}

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

@Component({
  selector: 'app-timesheets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './timesheets.component.html',
  styleUrl: './timesheets.component.scss'
})
export class TimesheetsComponent {
  selectedTimesheet: Timesheet | null = null;
  editMode = false;
  editedHours: { [key: number]: number } = {};

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
        { day: 'Lundi', date: '16/12', hours: 8, notes: '' },
        { day: 'Mardi', date: '17/12', hours: 8, notes: '' },
        { day: 'Mercredi', date: '18/12', hours: 7, notes: 'Départ anticipé' },
        { day: 'Jeudi', date: '19/12', hours: 8, notes: '' },
        { day: 'Vendredi', date: '20/12', hours: 7, notes: '' },
        { day: 'Samedi', date: '21/12', hours: 0, notes: '' },
        { day: 'Dimanche', date: '22/12', hours: 0, notes: '' },
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
        { day: 'Lundi', date: '16/12', hours: 8, notes: '' },
        { day: 'Mardi', date: '17/12', hours: 8, notes: '' },
        { day: 'Mercredi', date: '18/12', hours: 8, notes: '' },
        { day: 'Jeudi', date: '19/12', hours: 8, notes: '' },
        { day: 'Vendredi', date: '20/12', hours: 8, notes: '' },
        { day: 'Samedi', date: '21/12', hours: 0, notes: '' },
        { day: 'Dimanche', date: '22/12', hours: 0, notes: '' },
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
        { day: 'Lundi', date: '09/12', hours: 7, notes: '' },
        { day: 'Mardi', date: '10/12', hours: 7, notes: '' },
        { day: 'Mercredi', date: '11/12', hours: 7, notes: '' },
        { day: 'Jeudi', date: '12/12', hours: 7, notes: '' },
        { day: 'Vendredi', date: '13/12', hours: 7, notes: '' },
        { day: 'Samedi', date: '14/12', hours: 0, notes: '' },
        { day: 'Dimanche', date: '15/12', hours: 0, notes: '' },
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
        { day: 'Lundi', date: '09/12', hours: 9, notes: 'Heures supplémentaires' },
        { day: 'Mardi', date: '10/12', hours: 8, notes: '' },
        { day: 'Mercredi', date: '11/12', hours: 8, notes: '' },
        { day: 'Jeudi', date: '12/12', hours: 9, notes: 'Heures supplémentaires' },
        { day: 'Vendredi', date: '13/12', hours: 8, notes: '' },
        { day: 'Samedi', date: '14/12', hours: 0, notes: '' },
        { day: 'Dimanche', date: '15/12', hours: 0, notes: '' },
      ]
    }
  ];

  selectTimesheet(timesheet: Timesheet): void {
    this.selectedTimesheet = timesheet;
    this.editMode = false;
    this.editedHours = {};
  }

  backToList(): void {
    this.selectedTimesheet = null;
    this.editMode = false;
    this.editedHours = {};
  }

  toggleEditMode(): void {
    this.editMode = !this.editMode;
    if (!this.editMode) {
      this.editedHours = {};
    }
  }

  handleEditHours(dayIndex: number, value: string): void {
    this.editedHours[dayIndex] = parseFloat(value) || 0;
  }

  getCurrentHours(dayIndex: number): number {
    if (!this.selectedTimesheet) return 0;
    return this.editedHours[dayIndex] !== undefined 
      ? this.editedHours[dayIndex] 
      : this.selectedTimesheet.details[dayIndex].hours;
  }

  getTotalEditedHours(): number {
    if (!this.selectedTimesheet) return 0;
    const edited = Object.values(this.editedHours).reduce((sum, h) => sum + h, 0);
    return edited || this.selectedTimesheet.totalHours;
  }

  saveChanges(): void {
    console.log('Heures modifiées:', this.editedHours);
    this.editMode = false;
    this.editedHours = {};
  }

  handlePrint(): void {
    window.print();
  }

  handleExport(): void {
    alert('Export en PDF/Excel à venir');
  }

  approveTimesheet(): void {
    if (this.selectedTimesheet) {
      this.selectedTimesheet.status = 'approved';
    }
  }

  rejectTimesheet(): void {
    if (this.selectedTimesheet) {
      this.selectedTimesheet.status = 'rejected';
    }
  }

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

  isWeekend(index: number): boolean {
    return index >= 5;
  }

  getStandardHours(): number {
    if (!this.selectedTimesheet) return 0;
    return this.selectedTimesheet.details
      .filter(d => d.hours > 0 && d.hours <= 8)
      .reduce((sum, d) => sum + d.hours, 0);
  }

  getOvertimeHours(): number {
    if (!this.selectedTimesheet) return 0;
    return this.selectedTimesheet.details
      .filter(d => d.hours > 8)
      .reduce((sum, d) => sum + (d.hours - 8), 0);
  }

  getWorkedDays(): number {
    if (!this.selectedTimesheet) return 0;
    return this.selectedTimesheet.details.filter(d => d.hours > 0).length;
  }

  getAverageHours(): number {
    if (!this.selectedTimesheet) return 0;
    const workedDays = this.getWorkedDays();
    return workedDays > 0 ? this.getTotalEditedHours() / workedDays : 0;
  }

  getEndTime(hours: number): string {
    return `${9 + hours}:00`;
  }
}
