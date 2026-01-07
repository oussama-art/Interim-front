import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';

interface InterimWorker {
  id: number;
  name: string;
  email: string;
  phone: string;
  position: string;
  skills: string[];
  availability: 'available' | 'busy' | 'unavailable';
  rating: number;
  completedMissions: number;
}

@Component({
  selector: 'app-interim',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule
  ],
  templateUrl: './interim.component.html',
  styleUrl: './interim.component.scss'
})
export class InterimComponent {
  workers: InterimWorker[] = [
    {
      id: 1,
      name: 'Pierre Dubois',
      email: 'pierre.dubois@email.com',
      phone: '+33 6 12 34 56 78',
      position: 'Développeur Full Stack',
      skills: ['Angular', 'Java', 'Spring Boot', 'PostgreSQL'],
      availability: 'available',
      rating: 4.8,
      completedMissions: 12
    },
    {
      id: 2,
      name: 'Marie Martin',
      email: 'marie.martin@email.com',
      phone: '+33 6 23 45 67 89',
      position: 'Designer UI/UX',
      skills: ['Figma', 'Photoshop', 'Illustrator', 'Prototyping'],
      availability: 'busy',
      rating: 4.9,
      completedMissions: 18
    },
    {
      id: 3,
      name: 'Jean Lefebvre',
      email: 'jean.lefebvre@email.com',
      phone: '+33 6 34 56 78 90',
      position: 'Chef de chantier',
      skills: ['Gestion équipe', 'Planning', 'Sécurité', 'BTP'],
      availability: 'available',
      rating: 4.6,
      completedMissions: 25
    },
    {
      id: 4,
      name: 'Sophie Bernard',
      email: 'sophie.bernard@email.com',
      phone: '+33 6 45 67 89 01',
      position: 'Comptable',
      skills: ['Comptabilité', 'Excel', 'SAP', 'Fiscalité'],
      availability: 'unavailable',
      rating: 4.7,
      completedMissions: 8
    },
    {
      id: 5,
      name: 'Thomas Laurent',
      email: 'thomas.laurent@email.com',
      phone: '+33 6 56 78 90 12',
      position: 'Responsable logistique',
      skills: ['Supply Chain', 'Gestion stocks', 'SAP', 'Excel'],
      availability: 'available',
      rating: 4.5,
      completedMissions: 15
    }
  ];

  getAvailabilityLabel(availability: string): string {
    const labels: { [key: string]: string } = {
      'available': 'Disponible',
      'busy': 'En mission',
      'unavailable': 'Indisponible'
    };
    return labels[availability] || availability;
  }

  getAvailabilityClass(availability: string): string {
    return `availability-${availability}`;
  }
}
