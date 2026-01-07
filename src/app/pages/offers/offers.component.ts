import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';

interface Offer {
  id: number;
  title: string;
  company: string;
  location: string;
  contractType: string;
  salary: string;
  description: string;
  requirements: string[];
  postedDate: string;
  status: 'active' | 'closed' | 'filled';
  applicants: number;
}

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule
  ],
  templateUrl: './offers.component.html',
  styleUrl: './offers.component.scss'
})
export class OffersComponent {
  offers: Offer[] = [
    {
      id: 1,
      title: 'Développeur Full Stack Angular/Java',
      company: 'Tech Solutions SA',
      location: 'Paris, France',
      contractType: 'Intérim 6 mois',
      salary: '3500€ - 4200€',
      description: 'Nous recherchons un développeur full stack expérimenté pour rejoindre notre équipe de développement.',
      requirements: ['Angular', 'Java/Spring Boot', 'PostgreSQL', '3+ ans d\'expérience'],
      postedDate: '2024-12-15',
      status: 'active',
      applicants: 8
    },
    {
      id: 2,
      title: 'Designer UI/UX Senior',
      company: 'Digital Agency SARL',
      location: 'Lyon, France',
      contractType: 'Intérim 4 mois',
      salary: '3000€ - 3800€',
      description: 'Créez des expériences utilisateur exceptionnelles pour nos clients prestigieux.',
      requirements: ['Figma', 'Adobe Suite', 'Portfolio requis', '5+ ans d\'expérience'],
      postedDate: '2024-12-10',
      status: 'active',
      applicants: 12
    },
    {
      id: 3,
      title: 'Chef de chantier BTP',
      company: 'Construction Pro',
      location: 'Marseille, France',
      contractType: 'Intérim 12 mois',
      salary: '4000€ - 5000€',
      description: 'Supervision et coordination d\'un grand chantier de construction résidentielle.',
      requirements: ['Gestion d\'équipe', 'Sécurité chantier', 'Permis B', '7+ ans d\'expérience'],
      postedDate: '2024-11-25',
      status: 'filled',
      applicants: 15
    },
    {
      id: 4,
      title: 'Comptable confirmé',
      company: 'Finance Corp',
      location: 'Toulouse, France',
      contractType: 'Intérim 3 mois',
      salary: '2800€ - 3200€',
      description: 'Gestion comptable complète et préparation des clôtures mensuelles.',
      requirements: ['DCG/DSCG', 'SAP', 'Excel avancé', '4+ ans d\'expérience'],
      postedDate: '2024-12-01',
      status: 'active',
      applicants: 6
    },
    {
      id: 5,
      title: 'Responsable logistique',
      company: 'Logistique Express',
      location: 'Bordeaux, France',
      contractType: 'Intérim 8 mois',
      salary: '3500€ - 4000€',
      description: 'Optimisation de la chaîne logistique et gestion des stocks.',
      requirements: ['Supply Chain', 'WMS', 'Gestion d\'équipe', '5+ ans d\'expérience'],
      postedDate: '2024-11-20',
      status: 'closed',
      applicants: 20
    }
  ];

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'active': 'Active',
      'closed': 'Fermée',
      'filled': 'Pourvue'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }
}
